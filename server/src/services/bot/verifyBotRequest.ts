import { cutRequestPayload, isDelegatePublicKey, verifyPayload } from "@playthecut/agent";
import { Prisma } from "@prisma/client";
import { getAppPublicUrl } from "../../lib/appUrl.js";
import { isSupportedChain } from "../../lib/chainConfig.js";
import { prisma } from "../../lib/prisma.js";

const MAX_VALIDITY_SECONDS = 60 * 60;
const SKEW_SECONDS = 60;

export type VerifyBotRequestDeps = {
  now: () => number;
  consumeNonce: (key: string, expiresAt: Date) => Promise<boolean>;
};

export type VerifiedBotRequest = {
  ok: true;
  signer: string;
  chainId: number;
};

export type RejectedBotRequest = {
  ok: false;
  status: 400 | 401 | 503;
  error: string;
};

export function defaultBotRequestDeps(): VerifyBotRequestDeps {
  return {
    now: () => Math.floor(Date.now() / 1000),
    consumeNonce: async (key, expiresAt) => {
      await prisma.botRequestNonce.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      try {
        await prisma.botRequestNonce.create({ data: { key, expiresAt } });
        return true;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          return false;
        }
        throw error;
      }
    },
  };
}

function reject(status: RejectedBotRequest["status"], error: string): RejectedBotRequest {
  return { ok: false, status, error };
}

function header(request: Request, name: string): string {
  return request.headers.get(name)?.trim() ?? "";
}

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "");
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

/** Callers sign this deployment's public origin. A loopback request keeps its own URL. */
export function canonicalRequestUrl(request: Request): string {
  const url = new URL(request.url);
  if (isLoopbackHost(url.hostname)) return url.toString();
  const origin = new URL(getAppPublicUrl());
  url.protocol = origin.protocol;
  url.hostname = origin.hostname;
  url.port = origin.port;
  return url.toString();
}

export async function verifyBotRequest(
  request: Request,
  deps: VerifyBotRequestDeps = defaultBotRequestDeps(),
): Promise<VerifiedBotRequest | RejectedBotRequest> {
  const publicKey = header(request, "x-cut-public-key");
  const signature = header(request, "x-cut-signature");
  const createdRaw = header(request, "x-cut-created");
  const expiresRaw = header(request, "x-cut-expires");
  const nonce = header(request, "x-cut-nonce");
  const chainRaw = header(request, "x-cut-chain-id");
  if (!publicKey || !signature || !createdRaw || !expiresRaw || !nonce || !chainRaw) {
    return reject(401, "Missing request signature");
  }
  if (!isDelegatePublicKey(publicKey)) return reject(401, "Invalid public key");

  const created = Number(createdRaw);
  const expires = Number(expiresRaw);
  const chainId = Number(chainRaw);
  if (!Number.isInteger(created) || !Number.isInteger(expires) || !Number.isInteger(chainId)) {
    return reject(400, "Invalid deadline");
  }
  if (!isSupportedChain(chainId)) return reject(400, "Signature chain does not match the request");
  if (expires <= created) return reject(400, "Invalid deadline");
  if (expires - created > MAX_VALIDITY_SECONDS) {
    return reject(400, "Action deadline is too far in the future");
  }
  const now = deps.now();
  if (created > now + SKEW_SECONDS) return reject(401, "Action signature is not yet valid");
  if (expires < now) return reject(401, "Action signature has expired");
  if (!/^[A-Za-z0-9._~-]{8,128}$/.test(nonce)) return reject(400, "Invalid action nonce");

  const body = new Uint8Array(await request.arrayBuffer());
  const payload = cutRequestPayload({
    method: request.method,
    url: canonicalRequestUrl(request),
    body,
    chainId,
    created,
    expires,
    nonce,
  });
  if (!verifyPayload(publicKey, payload, signature)) {
    return reject(401, "Invalid action signature");
  }
  const fresh = await deps.consumeNonce(`${publicKey}:${nonce}`, new Date(expires * 1000));
  if (!fresh) return reject(401, "Action nonce has already been used");
  return { ok: true, signer: publicKey, chainId };
}
