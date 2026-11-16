import type { Address } from "viem";
import { verifyErc8128Request } from "./erc8128.js";

/** Base and Base Sepolia. The keyid chain id picks the chain for the whole request. */
export const SUPPORTED_BOT_CHAIN_IDS = [8453, 84532] as const;

export type BotRequestAuth = {
  signer: Address;
  chainId: number;
  nonce: string | undefined;
};

export type BotRequestLike = {
  method: string;
  url: string;
  header: (name: string) => string | undefined;
};

/**
 * Authenticate one `/api/bot/*` request. ERC-8128 is the only accepted auth:
 * `Signature-Input` / `Signature` headers (RFC 9421), keyid `eip8128:<chainId>:<address>`,
 * ERC-191 signature over the signature base, `Content-Digest` bound to the body.
 *
 * `requireNonce` is true for every write. Reads may omit the nonce.
 */
export async function authenticateBotRequest(
  req: BotRequestLike,
  rawBody: string,
  options: { requireNonce: boolean; nowSeconds?: number },
): Promise<{ ok: true; auth: BotRequestAuth } | { ok: false; status: 400 | 401; error: string }> {
  const signatureInput = req.header("signature-input");
  const signature = req.header("signature");
  if (!signatureInput || !signature) {
    return {
      ok: false,
      status: 401,
      error: "ERC-8128 signature required (Signature-Input and Signature headers)",
    };
  }

  const url = new URL(req.url);
  // The authority the client signed is the Host it sent. Prefer the Host header over the
  // URL the server reconstructed so a TLS-terminating proxy does not change it.
  const authority = req.header("host") ?? url.host;
  const verified = await verifyErc8128Request({
    method: req.method,
    authority,
    path: url.pathname,
    query: url.search || undefined,
    contentDigest: req.header("content-digest"),
    signatureInput,
    signature,
    body: rawBody.length > 0 ? rawBody : undefined,
    nowSeconds: options.nowSeconds ?? Math.floor(Date.now() / 1000),
  });
  if (!verified.ok) {
    return { ok: false, status: 401, error: verified.error };
  }
  if (
    !SUPPORTED_BOT_CHAIN_IDS.includes(verified.chainId as (typeof SUPPORTED_BOT_CHAIN_IDS)[number])
  ) {
    return {
      ok: false,
      status: 400,
      error: "keyid chainId must be 8453 (Base) or 84532 (Base Sepolia)",
    };
  }
  if (options.requireNonce && verified.nonce === undefined) {
    return { ok: false, status: 400, error: "Writes require a nonce in Signature-Input" };
  }
  return {
    ok: true,
    auth: { signer: verified.address, chainId: verified.chainId, nonce: verified.nonce },
  };
}
