import {
  createPublicClient,
  getAddress,
  hashTypedData,
  http,
  recoverAddress,
  type Address,
  type Hex,
  type LocalAccount,
  type TypedDataDefinition,
} from "viem";
import {
  entryPoint07Address,
  formatUserOperationRequest,
  getUserOperationHash,
} from "viem/account-abstraction";
import { createKernelAccount, createKernelAccountClient } from "@zerodev/sdk";
import { KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { toPermissionValidator } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import { toSudoPolicy } from "@zerodev/permissions/policies";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { getChainConfig } from "../../lib/chainConfig.js";
import { clientSafeErrorMessage } from "../../utils/clientSafeError.js";
import { assertSponsorableCalls } from "../paymaster/sponsorableCalls.js";
import type { BotCall } from "./botCalls.js";
import { parseUserOp, serializeUserOp, type SerializedUserOp } from "./submitSessionKeyUserOp.js";

/** Signature length used while the bundler estimates gas. Not a real authorization. */
const DUMMY_USER_OP_SIGNATURE =
  "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c" as Hex;

const entryPoint = {
  address: entryPoint07Address,
  version: "0.7" as const,
};

const SIGNATURE = /^0x[0-9a-fA-F]{130}$/;

export class YieldEnableHash extends Error {
  readonly hash: Hex;
  constructor(hash: Hex) {
    super("Enable signature required");
    this.name = "YieldEnableHash";
    this.hash = hash;
  }
}

export type YieldUserOpInput = {
  chainId: number;
  owner: Address;
  smartWallet: Address;
  embedded: Address;
  calls: BotCall[];
  permissionId: Hex;
  enableSignature?: Hex;
  userOpSignature?: Hex;
  userOp?: SerializedUserOp;
};

async function pimlicoUserOperationGas(bundlerClient: {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}) {
  const gasPrice = (await bundlerClient.request({
    method: "pimlico_getUserOperationGasPrice",
    params: [],
  })) as {
    standard: { maxFeePerGas: `0x${string}`; maxPriorityFeePerGas: `0x${string}` };
  };
  return {
    maxFeePerGas: BigInt(gasPrice.standard.maxFeePerGas),
    maxPriorityFeePerGas: BigInt(gasPrice.standard.maxPriorityFeePerGas),
  };
}

function bundlerUrl(): string | null {
  const url = process.env.PIMLICO_BUNDLER_URL?.trim();
  return url || null;
}

function causeOf(value: unknown): unknown {
  if (typeof value === "object" && value !== null && "cause" in value) {
    return (value as { cause?: unknown }).cause;
  }
  return undefined;
}

function enableHashFrom(error: unknown): Hex | null {
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current; depth += 1) {
    if (current instanceof YieldEnableHash) return current.hash;
    if (
      typeof current === "object" &&
      current !== null &&
      "name" in current &&
      current.name === "YieldEnableHash" &&
      "hash" in current &&
      typeof current.hash === "string"
    ) {
      return current.hash as Hex;
    }
    current = causeOf(current);
  }
  return null;
}

async function gate(input: YieldUserOpInput): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertSponsorableCalls(input.calls, {
      chainId: input.chainId,
      sender: getAddress(input.smartWallet),
      contestExists: async () => false,
      pendingOwner: getAddress(input.embedded),
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "User operation is not sponsorable";
    return { ok: false, error: message };
  }
}

function callDataFor(calls: BotCall[]) {
  return calls.map((call) => ({
    to: call.to,
    value: call.value,
    data: call.data,
  }));
}

function permissionSigner(owner: Address, userOpSignature: Hex): LocalAccount {
  return {
    address: owner,
    type: "local",
    source: "custom",
    publicKey: "0x",
    sign: async () => userOpSignature,
    signMessage: async () => userOpSignature,
    signTypedData: async () => userOpSignature,
    signTransaction: async () => {
      throw new Error("Account key does not sign transactions");
    },
  };
}

function enablingOwner(owner: Address, enableSignature: Hex | undefined): LocalAccount {
  return {
    address: owner,
    type: "local",
    source: "custom",
    publicKey: "0x",
    sign: async () => {
      throw new Error("Account key does not sign transactions");
    },
    signMessage: async () => {
      throw new Error("Account key does not sign the enable digest");
    },
    signTypedData: async (typedData) => {
      const hash = hashTypedData(typedData as TypedDataDefinition);
      if (enableSignature && SIGNATURE.test(enableSignature)) {
        try {
          const recovered = getAddress(await recoverAddress({ hash, signature: enableSignature }));
          if (recovered === owner) return enableSignature;
        } catch {
          // Ask for a signature over the digest this user operation is using.
        }
      }
      throw new YieldEnableHash(hash);
    },
    signTransaction: async () => {
      throw new Error("Account key does not sign transactions");
    },
  };
}

async function yieldAccount(input: YieldUserOpInput, userOpSignature: Hex, bundler: string) {
  const chainConfig = getChainConfig(input.chainId);
  const publicClient = createPublicClient({
    chain: chainConfig.chain,
    transport: http(chainConfig.rpcUrl),
  });
  const sudo = await signerToEcdsaValidator(publicClient, {
    signer: enablingOwner(input.owner, input.enableSignature),
    entryPoint,
    kernelVersion: KERNEL_V3_1,
  });
  const regular = await toPermissionValidator(publicClient, {
    entryPoint,
    kernelVersion: KERNEL_V3_1,
    signer: await toECDSASigner({ signer: permissionSigner(input.owner, userOpSignature) }),
    policies: [toSudoPolicy({})],
  });
  if (regular.getIdentifier().toLowerCase() !== input.permissionId.toLowerCase()) {
    throw new Error("Yield delegate does not match the stored approval");
  }
  const account = await createKernelAccount(publicClient, {
    entryPoint,
    kernelVersion: KERNEL_V3_1,
    address: getAddress(input.smartWallet),
    plugins: { sudo, regular },
  });
  if (getAddress(account.address) !== getAddress(input.smartWallet)) {
    throw new Error("User operation sender does not match the smart wallet");
  }
  const sponsorshipPolicyId = process.env.PIMLICO_SPONSORSHIP_POLICY_ID?.trim();
  const kernelClient = createKernelAccountClient({
    account,
    chain: chainConfig.chain,
    bundlerTransport: http(bundler),
    userOperation: {
      estimateFeesPerGas: async ({ bundlerClient }) =>
        pimlicoUserOperationGas(
          bundlerClient as {
            request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
          },
        ),
    },
    paymaster: sponsorshipPolicyId ? true : undefined,
    paymasterContext: sponsorshipPolicyId ? { sponsorshipPolicyId } : undefined,
  });
  return { account, kernelClient };
}

/**
 * Enable-mode user operation. The owner signs the enable digest first, which grants
 * this key the execute selector, then signs the user operation that rotates the root.
 */
export async function prepareYieldUserOp(
  input: YieldUserOpInput,
): Promise<
  | { ok: true; enableHash: Hex }
  | { ok: true; userOpHash: Hex; userOp: SerializedUserOp }
  | { ok: false; error: string }
> {
  const gated = await gate(input);
  if (!gated.ok) return gated;
  const bundler = bundlerUrl();
  if (!bundler) return { ok: false, error: "Bundler is not configured" };
  try {
    const session = await yieldAccount(input, DUMMY_USER_OP_SIGNATURE, bundler);
    const callData = await session.account.encodeCalls(callDataFor(input.calls));
    const prepared = await session.kernelClient.prepareUserOperation({ callData });
    if (getAddress(prepared.sender) !== getAddress(input.smartWallet)) {
      return { ok: false, error: "User operation sender does not match the smart wallet" };
    }
    const userOp = { ...prepared, signature: "0x" as Hex };
    const userOpHash = getUserOperationHash({
      chainId: input.chainId,
      entryPointAddress: entryPoint.address,
      entryPointVersion: "0.7",
      userOperation: userOp,
    });
    return { ok: true, userOpHash, userOp: serializeUserOp(userOp) };
  } catch (error) {
    const hash = enableHashFrom(error);
    if (hash) return { ok: true, enableHash: hash };
    return { ok: false, error: clientSafeErrorMessage(error, "User operation failed") };
  }
}

export async function submitYieldUserOp(
  input: YieldUserOpInput,
): Promise<{ ok: true; txHash: Hex } | { ok: false; error: string }> {
  const gated = await gate(input);
  if (!gated.ok) return gated;
  if (!input.userOp || !input.userOpSignature) {
    return { ok: false, error: "Missing account key signature" };
  }
  if (!input.enableSignature || !SIGNATURE.test(input.enableSignature)) {
    return { ok: false, error: "Invalid enable signature" };
  }
  const bundler = bundlerUrl();
  if (!bundler) return { ok: false, error: "Bundler is not configured" };
  try {
    const session = await yieldAccount(input, input.userOpSignature, bundler);
    const callData = await session.account.encodeCalls(callDataFor(input.calls));
    const userOp = parseUserOp(input.userOp);
    if (getAddress(userOp.sender) !== getAddress(input.smartWallet)) {
      return { ok: false, error: "User operation sender does not match the smart wallet" };
    }
    if (userOp.callData !== callData) {
      return { ok: false, error: "User operation does not match this yield" };
    }
    const signature = await session.account.signUserOperation({
      ...userOp,
      chainId: input.chainId,
    });
    const userOpHash = await session.kernelClient.request({
      method: "eth_sendUserOperation",
      params: [formatUserOperationRequest({ ...userOp, signature }), entryPoint.address],
    });
    const receipt = await session.kernelClient.waitForUserOperationReceipt({ hash: userOpHash });
    return { ok: true, txHash: receipt.receipt.transactionHash };
  } catch (error) {
    const hash = enableHashFrom(error);
    if (hash) return { ok: false, error: "Enable signature does not match this yield" };
    return { ok: false, error: clientSafeErrorMessage(error, "User operation failed") };
  }
}
