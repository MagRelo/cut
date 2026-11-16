import {
  createPublicClient,
  getAddress,
  http,
  type Address,
  type Hex,
  type LocalAccount,
} from "viem";
import {
  entryPoint07Address,
  formatUserOperationRequest,
  getUserOperationHash,
  type UserOperation,
} from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
import { createKernelAccount, createKernelAccountClient } from "@zerodev/sdk";
import { KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { deserializePermissionAccount } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { getChainConfig } from "../../lib/chainConfig.js";
import type { BotCall } from "./botCalls.js";
import { policyProofForChain, withPolicyProof } from "./delegateProof.js";

/** Signature length used while the bundler estimates gas. Not a real authorization. */
const DUMMY_USER_OP_SIGNATURE =
  "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c" as Hex;

export type SerializedUserOp = {
  sender: Address;
  nonce: string;
  callData: Hex;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymaster?: Address;
  paymasterData?: Hex;
  paymasterVerificationGasLimit?: string;
  paymasterPostOpGasLimit?: string;
  factory?: Address;
  factoryData?: Hex;
};

const entryPoint = {
  address: entryPoint07Address,
  version: "0.7" as const,
};

/**
 * Who authorizes the user operation.
 * - `session`: an installed Kernel permission session key (Cut Bot or an external delegate).
 * - `owner`: the wallet's ECDSA owner key (sudo validator). Works for undeployed wallets:
 *   the first user operation carries the factory data and deploys the wallet.
 */
export type UserOpAuthority =
  | { kind: "session"; approval: string; delegateAddress: Address }
  | { kind: "owner"; ownerAddress: Address };

export type SubmitSessionKeyInput = {
  chainId: number;
  authority: UserOpAuthority;
  calls: BotCall[];
  smartWallet: Address;
  /** Server-held key (Cut Bot only). Everyone else signs `userOpHash` themselves. */
  privateKey?: Hex | undefined;
  userOpSignature?: Hex | undefined;
  userOp?: SerializedUserOp | undefined;
};

/** ZeroDev's default asks for `zd_getUserOperationGasPrice`, which Pimlico does not serve. */
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

type SessionClient = {
  account: {
    encodeCalls: (calls: { to: Address; value: bigint; data: Hex }[]) => Promise<Hex>;
    signUserOperation: (parameters: UserOperation<"0.7"> & { chainId?: number }) => Promise<Hex>;
  };
  kernelClient: {
    prepareUserOperation: (args: { callData: Hex }) => Promise<UserOperation<"0.7">>;
    sendUserOperation: (args: { callData: Hex }) => Promise<Hex>;
    waitForUserOperationReceipt: (args: {
      hash: Hex;
    }) => Promise<{ receipt: { transactionHash: Hex } }>;
    request: (args: {
      method: "eth_sendUserOperation";
      params: [ReturnType<typeof formatUserOperationRequest>, Address];
    }) => Promise<Hex>;
  };
};

async function sessionClient(
  input: SubmitSessionKeyInput,
  signature: Hex,
): Promise<SessionClient | { ok: false; error: string }> {
  const bundler = bundlerUrl();
  if (!bundler) return { ok: false, error: "Bundler is not configured" };
  const chainConfig = getChainConfig(input.chainId);
  const publicClient = createPublicClient({
    chain: chainConfig.chain,
    transport: http(chainConfig.rpcUrl),
  });
  const signerAddress =
    input.authority.kind === "session"
      ? input.authority.delegateAddress
      : input.authority.ownerAddress;
  const signer = input.privateKey
    ? privateKeyToAccount(input.privateKey)
    : fixedSignatureAccount(signerAddress, signature);
  const account =
    input.authority.kind === "session"
      ? await deserializePermissionAccount(
          publicClient,
          entryPoint,
          KERNEL_V3_1,
          input.authority.approval,
          await toECDSASigner({ signer }),
        )
      : await createKernelAccount(publicClient, {
          entryPoint,
          kernelVersion: KERNEL_V3_1,
          plugins: {
            sudo: await signerToEcdsaValidator(publicClient, {
              signer,
              entryPoint,
              kernelVersion: KERNEL_V3_1,
            }),
          },
          index: 0n,
          // Pin the address so an on-chain owner rotation still targets this wallet.
          address: getAddress(input.smartWallet),
        });
  if (getAddress(account.address) !== getAddress(input.smartWallet)) {
    return { ok: false, error: "Signer does not control this smart wallet" };
  }
  if (input.authority.kind === "session") {
    // The delegate policy needs a contest proof in its signature slot (see delegateProof.ts).
    const proof = await policyProofForChain(input.chainId, input.calls);
    if (!proof.ok) return proof;
    const getStubSignature = account.getStubSignature.bind(account);
    const signUserOperation = account.signUserOperation.bind(account);
    account.getStubSignature = (async (...args: Parameters<typeof getStubSignature>) =>
      withPolicyProof(await getStubSignature(...args), proof.proof)) as typeof getStubSignature;
    account.signUserOperation = (async (...args: Parameters<typeof signUserOperation>) =>
      withPolicyProof(await signUserOperation(...args), proof.proof)) as typeof signUserOperation;
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

export function serializeUserOp(userOp: UserOperation<"0.7">): SerializedUserOp {
  return {
    sender: userOp.sender,
    nonce: userOp.nonce.toString(),
    callData: userOp.callData,
    callGasLimit: userOp.callGasLimit.toString(),
    verificationGasLimit: userOp.verificationGasLimit.toString(),
    preVerificationGas: userOp.preVerificationGas.toString(),
    maxFeePerGas: userOp.maxFeePerGas.toString(),
    maxPriorityFeePerGas: userOp.maxPriorityFeePerGas.toString(),
    ...(userOp.paymaster ? { paymaster: userOp.paymaster } : {}),
    ...(userOp.paymasterData ? { paymasterData: userOp.paymasterData } : {}),
    ...(userOp.paymasterVerificationGasLimit != null
      ? { paymasterVerificationGasLimit: userOp.paymasterVerificationGasLimit.toString() }
      : {}),
    ...(userOp.paymasterPostOpGasLimit != null
      ? { paymasterPostOpGasLimit: userOp.paymasterPostOpGasLimit.toString() }
      : {}),
    ...(userOp.factory ? { factory: userOp.factory } : {}),
    ...(userOp.factoryData ? { factoryData: userOp.factoryData } : {}),
  };
}

export function parseUserOp(userOp: SerializedUserOp): UserOperation<"0.7"> {
  return {
    sender: getAddress(userOp.sender),
    nonce: BigInt(userOp.nonce),
    callData: userOp.callData,
    callGasLimit: BigInt(userOp.callGasLimit),
    verificationGasLimit: BigInt(userOp.verificationGasLimit),
    preVerificationGas: BigInt(userOp.preVerificationGas),
    maxFeePerGas: BigInt(userOp.maxFeePerGas),
    maxPriorityFeePerGas: BigInt(userOp.maxPriorityFeePerGas),
    signature: "0x",
    ...(userOp.paymaster ? { paymaster: getAddress(userOp.paymaster) } : {}),
    ...(userOp.paymasterData ? { paymasterData: userOp.paymasterData } : {}),
    ...(userOp.paymasterVerificationGasLimit
      ? { paymasterVerificationGasLimit: BigInt(userOp.paymasterVerificationGasLimit) }
      : {}),
    ...(userOp.paymasterPostOpGasLimit
      ? { paymasterPostOpGasLimit: BigInt(userOp.paymasterPostOpGasLimit) }
      : {}),
    ...(userOp.factory ? { factory: getAddress(userOp.factory) } : {}),
    ...(userOp.factoryData ? { factoryData: userOp.factoryData } : {}),
  };
}

/**
 * Fill gas, nonce, and paymaster data for the canonical calls and return the hash a
 * personal delegate or the wallet owner signs. Cut Bot does not use this. The server signs at submit time.
 */
export async function prepareSessionKeyUserOp(
  input: SubmitSessionKeyInput,
): Promise<{ ok: true; userOpHash: Hex; userOp: SerializedUserOp } | { ok: false; error: string }> {
  try {
    const session = await sessionClient(input, DUMMY_USER_OP_SIGNATURE);
    if ("ok" in session) return session;
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
    const message = error instanceof Error ? error.message : "User operation failed";
    return { ok: false, error: message };
  }
}

/**
 * Submit calls already authorized by a session key.
 * Cut Bot passes its private key and the server signs the user operation it builds.
 * A personal delegate passes the signature over a previously returned userOpHash,
 * and the server submits that same user operation.
 */
export async function submitSessionKeyUserOp(
  input: SubmitSessionKeyInput,
): Promise<{ ok: true; txHash: Hex } | { ok: false; error: string }> {
  if (!input.privateKey && !(input.userOpSignature && input.userOp)) {
    return { ok: false, error: "Missing session key signature" };
  }
  if (input.userOp && input.userOpSignature) {
    return submitPreparedSessionKeyUserOp(input);
  }

  try {
    const session = await sessionClient(input, DUMMY_USER_OP_SIGNATURE);
    if ("ok" in session) return session;
    const userOpHash = await session.kernelClient.sendUserOperation({
      callData: await session.account.encodeCalls(callDataFor(input.calls)),
    });
    const receipt = await session.kernelClient.waitForUserOperationReceipt({ hash: userOpHash });
    return { ok: true, txHash: receipt.receipt.transactionHash };
  } catch (error) {
    const message = error instanceof Error ? error.message : "User operation failed";
    return { ok: false, error: message };
  }
}

async function submitPreparedSessionKeyUserOp(
  input: SubmitSessionKeyInput,
): Promise<{ ok: true; txHash: Hex } | { ok: false; error: string }> {
  if (!input.userOp || !input.userOpSignature) {
    return { ok: false, error: "Missing session key signature" };
  }
  try {
    const session = await sessionClient(input, input.userOpSignature);
    if ("ok" in session) return session;
    const callData = await session.account.encodeCalls(callDataFor(input.calls));
    const userOp = parseUserOp(input.userOp);
    if (getAddress(userOp.sender) !== getAddress(input.smartWallet)) {
      return { ok: false, error: "User operation sender does not match the smart wallet" };
    }
    if (userOp.callData !== callData) {
      return { ok: false, error: "User operation does not match this contest" };
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
    const message = error instanceof Error ? error.message : "User operation failed";
    return { ok: false, error: message };
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
      throw new Error("Session key does not sign transactions");
    },
  };
}
