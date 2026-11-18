import { createPublicClient, getAddress, http, type Address, type Hex, type LocalAccount } from "viem";
import {
  entryPoint07Address,
  formatUserOperationRequest,
  getUserOperationHash,
  type UserOperation,
} from "viem/account-abstraction";
import { addressToEmptyAccount, createKernelAccount, createKernelAccountClient } from "@zerodev/sdk";
import { KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { kernelWalletAddress } from "@playthecut/agent";
import { getChainConfig } from "../../lib/chainConfig.js";
import { clientSafeErrorMessage } from "../../utils/clientSafeError.js";
import { prismaSponsorshipDeps } from "../paymaster/validateSponsorshipUserOp.js";
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

export type OwnerUserOpInput = {
  chainId: number;
  owner: Address;
  smartWallet: Address;
  calls: BotCall[];
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

/** Same allowlist as POST /api/paymaster, applied before the bundler is contacted. */
async function gateOwnerCalls(
  input: OwnerUserOpInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (kernelWalletAddress(input.owner, input.chainId) !== getAddress(input.smartWallet)) {
      return { ok: false, error: "User operation sender does not match the smart wallet" };
    }
    const deps = prismaSponsorshipDeps();
    await assertSponsorableCalls(input.calls, {
      chainId: input.chainId,
      sender: getAddress(input.smartWallet),
      contestExists: (address) => deps.contestExists(input.chainId, address),
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "User operation is not sponsorable";
    return { ok: false, error: message };
  }
}

type OwnerClient = {
  account: {
    encodeCalls: (calls: { to: Address; value: bigint; data: Hex }[]) => Promise<Hex>;
    signUserOperation: (parameters: UserOperation<"0.7"> & { chainId?: number }) => Promise<Hex>;
  };
  kernelClient: {
    prepareUserOperation: (args: { callData: Hex }) => Promise<UserOperation<"0.7">>;
    waitForUserOperationReceipt: (args: {
      hash: Hex;
    }) => Promise<{ receipt: { transactionHash: Hex } }>;
    request: (args: {
      method: "eth_sendUserOperation";
      params: [ReturnType<typeof formatUserOperationRequest>, Address];
    }) => Promise<Hex>;
  };
};

async function ownerClient(
  input: OwnerUserOpInput,
  signature: Hex,
): Promise<OwnerClient | { ok: false; error: string }> {
  const bundler = bundlerUrl();
  if (!bundler) return { ok: false, error: "Bundler is not configured" };
  const chainConfig = getChainConfig(input.chainId);
  const publicClient = createPublicClient({
    chain: chainConfig.chain,
    transport: http(chainConfig.rpcUrl),
  });
  const signer =
    signature === DUMMY_USER_OP_SIGNATURE
      ? addressToEmptyAccount(input.owner)
      : fixedSignatureAccount(input.owner, signature);
  const sudo = await signerToEcdsaValidator(publicClient, {
    signer,
    entryPoint,
    kernelVersion: KERNEL_V3_1,
  });
  const account = await createKernelAccount(publicClient, {
    entryPoint,
    kernelVersion: KERNEL_V3_1,
    plugins: { sudo },
  });
  if (getAddress(account.address) !== getAddress(input.smartWallet)) {
    return { ok: false, error: "User operation sender does not match the smart wallet" };
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

function callDataFor(calls: BotCall[]) {
  return calls.map((call) => ({
    to: call.to,
    value: call.value,
    data: call.data,
  }));
}

/**
 * Fill gas, nonce, and paymaster data for the account key's calls.
 * The owner signs the returned hash on the next request.
 */
export async function prepareOwnerUserOp(
  input: OwnerUserOpInput,
): Promise<{ ok: true; userOpHash: Hex; userOp: SerializedUserOp } | { ok: false; error: string }> {
  const gated = await gateOwnerCalls(input);
  if (!gated.ok) return gated;
  try {
    const owner = await ownerClient(input, DUMMY_USER_OP_SIGNATURE);
    if ("ok" in owner) return owner;
    const callData = await owner.account.encodeCalls(callDataFor(input.calls));
    const prepared = await owner.kernelClient.prepareUserOperation({ callData });
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
    return { ok: false, error: clientSafeErrorMessage(error, "User operation failed") };
  }
}

/** Submit the user operation the account key already signed. */
export async function submitOwnerUserOp(
  input: OwnerUserOpInput,
): Promise<{ ok: true; txHash: Hex } | { ok: false; error: string }> {
  const gated = await gateOwnerCalls(input);
  if (!gated.ok) return gated;
  if (!input.userOp || !input.userOpSignature) {
    return { ok: false, error: "Missing account key signature" };
  }
  try {
    const owner = await ownerClient(input, input.userOpSignature);
    if ("ok" in owner) return owner;
    const callData = await owner.account.encodeCalls(callDataFor(input.calls));
    const userOp = parseUserOp(input.userOp);
    if (getAddress(userOp.sender) !== getAddress(input.smartWallet)) {
      return { ok: false, error: "User operation sender does not match the smart wallet" };
    }
    if (userOp.callData !== callData) {
      return { ok: false, error: "User operation does not match this contest" };
    }
    const signature = await owner.account.signUserOperation({
      ...userOp,
      chainId: input.chainId,
    });
    const userOpHash = await owner.kernelClient.request({
      method: "eth_sendUserOperation",
      params: [formatUserOperationRequest({ ...userOp, signature }), entryPoint.address],
    });
    const receipt = await owner.kernelClient.waitForUserOperationReceipt({ hash: userOpHash });
    return { ok: true, txHash: receipt.receipt.transactionHash };
  } catch (error) {
    return { ok: false, error: clientSafeErrorMessage(error, "User operation failed") };
  }
}

function fixedSignatureAccount(address: Address, signature: Hex): LocalAccount {
  return {
    address,
    type: "local",
    source: "custom",
    publicKey: "0x",
    sign: async () => signature,
    signMessage: async () => signature,
    signTypedData: async () => signature,
    signTransaction: async () => {
      throw new Error("Account key does not sign transactions");
    },
  };
}
