import {
  gasFromPaymasterResult,
  assertSponsorshipGas,
  prismaSponsorshipDeps,
  validateSponsorshipUserOp,
  type SponsorshipDeps,
} from "./validateSponsorshipUserOp.js";

const ALLOWED_METHODS = new Set(["pm_getPaymasterStubData", "pm_getPaymasterData"]);

type JsonRpcId = string | number | null;

export type JsonRpcSuccess = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result: unknown;
};

export type JsonRpcFailure = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  error: { code: number; message: string };
};

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcFailure;

type Forward = (request: {
  id: JsonRpcId;
  method: string;
  params: unknown[];
}) => Promise<unknown>;

function failure(id: JsonRpcId, code: number, message: string): JsonRpcFailure {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function parseChainId(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && value.trim() !== "") return Number(BigInt(value));
  throw new Error("Chain is not supported");
}

function requestId(body: Record<string, unknown>): JsonRpcId {
  const id = body.id;
  if (typeof id === "string" || typeof id === "number" || id === null) return id;
  return null;
}

export function pimlicoForward(): Forward {
  return async (request) => {
    const url = process.env.PIMLICO_BUNDLER_URL?.trim();
    const sponsorshipPolicyId = process.env.PIMLICO_SPONSORSHIP_POLICY_ID?.trim();
    if (!url || !sponsorshipPolicyId) {
      throw new Error("Sponsorship is not configured");
    }
    const params = [...request.params];
    params[3] = { sponsorshipPolicyId };
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: request.id ?? 1,
        method: request.method,
        params,
      }),
    });
    return response.json() as Promise<unknown>;
  };
}

/**
 * ERC-7677 paymaster methods Privy posts to the paymaster URL.
 * The policy id on the way to Pimlico always comes from the server env.
 */
export async function handlePaymasterRpc(
  body: unknown,
  options?: { deps?: SponsorshipDeps; forward?: Forward },
): Promise<JsonRpcResponse> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return failure(null, -32600, "Invalid request");
  }
  const record = body as Record<string, unknown>;
  const id = requestId(record);
  const method = record.method;
  if (typeof method !== "string" || !ALLOWED_METHODS.has(method)) {
    return failure(id, -32601, "Method not allowed");
  }
  if (!Array.isArray(record.params) || record.params.length < 3) {
    return failure(id, -32602, "Invalid params");
  }
  const params = record.params;
  const userOp = params[0];
  try {
    await validateSponsorshipUserOp(
      {
        userOp: (userOp ?? {}) as {
          sender?: unknown;
          callData?: unknown;
          callGasLimit?: unknown;
          verificationGasLimit?: unknown;
          preVerificationGas?: unknown;
        },
        entryPoint: params[1],
        chainId: parseChainId(params[2]),
      },
      options?.deps ?? prismaSponsorshipDeps(),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "User operation is not sponsorable";
    return failure(id, -32602, message);
  }

  let forwarded: unknown;
  try {
    forwarded = await (options?.forward ?? pimlicoForward())({ id, method, params });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sponsorship is not configured";
    return failure(id, -32603, message);
  }
  if (!forwarded || typeof forwarded !== "object") {
    return failure(id, -32603, "Paymaster response is invalid");
  }
  const rpc = forwarded as { error?: { code?: number; message?: string }; result?: unknown };
  if (rpc.error) {
    return failure(id, rpc.error.code ?? -32603, rpc.error.message ?? "Paymaster rejected the user operation");
  }
  try {
    assertSponsorshipGas(gasFromPaymasterResult(rpc.result));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gas limit is too high";
    return failure(id, -32602, message);
  }
  return { jsonrpc: "2.0", id, result: rpc.result };
}
