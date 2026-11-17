import {
  createUniversalAccountVerifier,
  ERC1271_ABI,
  verifyRequest,
  type GetAccountCodeFn,
  type NonceStore,
  type VerifySmartAccountFn,
} from "@slicekit/erc8128";
import { getAddress, type Address } from "viem";
import { isSupportedChain } from "../../lib/chainConfig.js";
import { getPublicClient } from "../shared/contractClient.js";
import { createBotNonceStore } from "./botNonceStore.js";

const MAX_VALIDITY_SECONDS = 60 * 60;
const ERC1271_MAGIC = "0x1626ba7e";

export type VerifyBotRequestDeps = {
  getCode: GetAccountCodeFn;
  verifySmartAccount: VerifySmartAccountFn;
  nonceStore: NonceStore;
  now: () => number;
};

export type VerifiedBotRequest = {
  ok: true;
  signer: Address;
  chainId: number;
};

export type RejectedBotRequest = {
  ok: false;
  status: 400 | 401 | 503;
  error: string;
};

const FAILURES: Record<string, RejectedBotRequest> = {
  signature_missing: { ok: false, status: 401, error: "Missing request signature" },
  no_acceptable_signature: { ok: false, status: 401, error: "Invalid action signature" },
  signature_input_invalid: { ok: false, status: 401, error: "Invalid action signature" },
  signature_too_large: { ok: false, status: 401, error: "Invalid action signature" },
  invalid_keyid: { ok: false, status: 401, error: "Invalid action signature" },
  invalid_time: { ok: false, status: 400, error: "Invalid deadline" },
  request_not_yet_valid: { ok: false, status: 401, error: "Action signature is not yet valid" },
  request_expired: { ok: false, status: 401, error: "Action signature has expired" },
  request_validity_too_long: {
    ok: false,
    status: 400,
    error: "Action deadline is too far in the future",
  },
  invalid_nonce: { ok: false, status: 400, error: "Invalid action nonce" },
  insufficient_coverage: { ok: false, status: 401, error: "Invalid action signature" },
  content_digest_required: { ok: false, status: 401, error: "Request body does not match the signature" },
  bad_content_digest: { ok: false, status: 401, error: "Request body does not match the signature" },
  nonce_required: { ok: false, status: 401, error: "Invalid action signature" },
  nonce_reused: { ok: false, status: 401, error: "Action nonce has already been used" },
  replayable_not_allowed: { ok: false, status: 401, error: "Invalid action signature" },
  unsupported_algorithm: { ok: false, status: 401, error: "Invalid action signature" },
  bad_signature: { ok: false, status: 401, error: "Invalid action signature" },
  principal_not_allowed: { ok: false, status: 401, error: "Invalid action signature" },
  signature_verification_unavailable: {
    ok: false,
    status: 503,
    error: "Signature verification is unavailable",
  },
};

export function defaultBotRequestDeps(): VerifyBotRequestDeps {
  return {
    getCode: async ({ address, chainId }) => {
      if (!isSupportedChain(chainId)) return "unavailable";
      try {
        const code = await getPublicClient(chainId).getBytecode({ address });
        return code ?? "0x";
      } catch {
        return "unavailable";
      }
    },
    verifySmartAccount: async ({ address, chainId, digest, signature }) => {
      if (!isSupportedChain(chainId)) return "unavailable";
      try {
        const result = await getPublicClient(chainId).readContract({
          address,
          abi: ERC1271_ABI,
          functionName: "isValidSignature",
          args: [digest, signature],
        });
        return result.toLowerCase() === ERC1271_MAGIC;
      } catch {
        return "unavailable";
      }
    },
    nonceStore: createBotNonceStore(),
    now: () => Math.floor(Date.now() / 1000),
  };
}

/** Nginx terminates TLS, so Node sees `http://`. The signature covers the public `@scheme`. */
function requestAtPublicOrigin(request: Request): Request {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (forwarded !== "https" && forwarded !== "http") return request;
  const url = new URL(request.url);
  if (url.protocol === `${forwarded}:`) return request;
  url.protocol = `${forwarded}:`;
  return new Request(url, request);
}

export async function verifyBotRequest(
  request: Request,
  deps: VerifyBotRequestDeps = defaultBotRequestDeps(),
): Promise<VerifiedBotRequest | RejectedBotRequest> {
  const result = await verifyRequest({
    request: requestAtPublicOrigin(request),
    verifyMessage: createUniversalAccountVerifier({
      getCode: deps.getCode,
      verifySmartAccount: deps.verifySmartAccount,
    }),
    nonceStore: deps.nonceStore,
    policy: {
      principal: "direct",
      accountVerification: "universal",
      replayable: false,
      contentDigest: "recompute",
      maxValiditySec: MAX_VALIDITY_SECONDS,
      maxNonceWindowSec: MAX_VALIDITY_SECONDS,
      now: deps.now,
    },
  });
  if (!result.ok) {
    return (
      FAILURES[result.reason] ?? { ok: false, status: 401, error: "Invalid action signature" }
    );
  }
  if (result.delegated || result.binding !== "request-bound" || result.replay !== "non-replayable") {
    return { ok: false, status: 401, error: "Invalid action signature" };
  }
  if (!isSupportedChain(result.signer.chainId)) {
    return {
      ok: false,
      status: 400,
      error: "ChainId must be 8453 (Base) or 84532 (Base Sepolia)",
    };
  }
  return {
    ok: true,
    signer: getAddress(result.signer.address),
    chainId: result.signer.chainId,
  };
}
