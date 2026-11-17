import { getAddress, isAddress, type Address, type Hex } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { prisma } from "../../lib/prisma.js";
import type { BotCall } from "../bot/botCalls.js";
import { decodeKernelExecute } from "./kernelExecute.js";
import { assertSponsorableCalls } from "./sponsorableCalls.js";

/** A real contest entry is a few hundred thousand gas. The drained ops asked for 8,000,000. */
export const SPONSORSHIP_GAS_CAPS = {
  callGasLimit: 1_000_000n,
  verificationGasLimit: 1_000_000n,
  preVerificationGas: 300_000n,
} as const;

const SUPPORTED_CHAINS = new Set([8453, 84532]);

export type SponsorshipGas = {
  callGasLimit?: bigint;
  verificationGasLimit?: bigint;
  preVerificationGas?: bigint;
};

export function assertSponsorshipGas(gas: SponsorshipGas): void {
  const callGasLimit = gas.callGasLimit;
  const verificationGasLimit = gas.verificationGasLimit;
  const preVerificationGas = gas.preVerificationGas;
  if (callGasLimit != null && callGasLimit > SPONSORSHIP_GAS_CAPS.callGasLimit) {
    throw new Error("Call gas limit is too high");
  }
  if (verificationGasLimit != null && verificationGasLimit > SPONSORSHIP_GAS_CAPS.verificationGasLimit) {
    throw new Error("Verification gas limit is too high");
  }
  if (preVerificationGas != null && preVerificationGas > SPONSORSHIP_GAS_CAPS.preVerificationGas) {
    throw new Error("Pre-verification gas is too high");
  }
}

export function parseGasQuantity(value: unknown): bigint | undefined {
  if (value == null) return undefined;
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) throw new Error("Gas limit is invalid");
    return BigInt(Math.trunc(value));
  }
  if (typeof value === "string" && value.trim() !== "") {
    return BigInt(value);
  }
  throw new Error("Gas limit is invalid");
}

export type SponsorshipDeps = {
  senderIsKnown: (chainId: number, sender: Address) => Promise<boolean>;
  contestExists: (chainId: number, address: Address) => Promise<boolean>;
};

export function prismaSponsorshipDeps(): SponsorshipDeps {
  return {
    senderIsKnown: async (chainId, sender) => {
      const row = await prisma.userWallet.findUnique({
        where: { chainId_publicKey: { chainId, publicKey: sender.toLowerCase() } },
        select: { id: true },
      });
      return row != null;
    },
    contestExists: async (chainId, address) => {
      const row = await prisma.contest.findFirst({
        where: { chainId, address: { equals: address, mode: "insensitive" } },
        select: { id: true },
      });
      return row != null;
    },
  };
}

export type SponsorshipUserOp = {
  sender?: unknown;
  callData?: unknown;
  callGasLimit?: unknown;
  verificationGasLimit?: unknown;
  preVerificationGas?: unknown;
};

/**
 * Reject a user operation before Pimlico simulates it.
 * The sender must already be a Cut wallet. The calldata must be a Kernel v3.1
 * execute whose calls are on the sponsorship allowlist.
 */
export async function validateSponsorshipUserOp(
  input: {
    userOp: SponsorshipUserOp;
    entryPoint: unknown;
    chainId: number;
  },
  deps: SponsorshipDeps,
): Promise<BotCall[]> {
  if (!SUPPORTED_CHAINS.has(input.chainId)) {
    throw new Error("Chain is not supported");
  }
  if (typeof input.entryPoint !== "string" || !isAddress(input.entryPoint)) {
    throw new Error("EntryPoint is not supported");
  }
  if (getAddress(input.entryPoint) !== getAddress(entryPoint07Address)) {
    throw new Error("EntryPoint is not supported");
  }
  if (!input.userOp || typeof input.userOp !== "object") {
    throw new Error("User operation is invalid");
  }
  if (typeof input.userOp.sender !== "string" || !isAddress(input.userOp.sender)) {
    throw new Error("User operation sender is invalid");
  }
  if (typeof input.userOp.callData !== "string" || !input.userOp.callData.startsWith("0x")) {
    throw new Error("User operation calldata is not a Kernel execute");
  }
  const sender = getAddress(input.userOp.sender);
  if (!(await deps.senderIsKnown(input.chainId, sender))) {
    throw new Error("Sender is not a Cut wallet");
  }
  const callGasLimit = parseGasQuantity(input.userOp.callGasLimit);
  const verificationGasLimit = parseGasQuantity(input.userOp.verificationGasLimit);
  const preVerificationGas = parseGasQuantity(input.userOp.preVerificationGas);
  assertSponsorshipGas({
    ...(callGasLimit != null ? { callGasLimit } : {}),
    ...(verificationGasLimit != null ? { verificationGasLimit } : {}),
    ...(preVerificationGas != null ? { preVerificationGas } : {}),
  });
  const calls = decodeKernelExecute(input.userOp.callData as Hex);
  await assertSponsorableCalls(calls, {
    chainId: input.chainId,
    sender,
    contestExists: (address) => deps.contestExists(input.chainId, address),
  });
  return calls;
}

export function gasFromPaymasterResult(result: unknown): SponsorshipGas {
  if (!result || typeof result !== "object") return {};
  const row = result as Record<string, unknown>;
  const callGasLimit = parseGasQuantity(row.callGasLimit);
  const verificationGasLimit = parseGasQuantity(row.verificationGasLimit);
  const preVerificationGas = parseGasQuantity(row.preVerificationGas);
  return {
    ...(callGasLimit != null ? { callGasLimit } : {}),
    ...(verificationGasLimit != null ? { verificationGasLimit } : {}),
    ...(preVerificationGas != null ? { preVerificationGas } : {}),
  };
}
