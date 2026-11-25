import { getAddress, isAddress, isHex, type Address, type Hex } from "viem";
import { entryPoint07Address, getUserOperationHash, type UserOperation } from "viem/account-abstraction";
import type { UserOpBody } from "./contract.js";

function parseUserOp(userOp: UserOpBody): UserOperation<"0.7"> {
  return {
    sender: getAddress(userOp.sender),
    nonce: BigInt(userOp.nonce),
    callData: userOp.callData as Hex,
    callGasLimit: BigInt(userOp.callGasLimit),
    verificationGasLimit: BigInt(userOp.verificationGasLimit),
    preVerificationGas: BigInt(userOp.preVerificationGas),
    maxFeePerGas: BigInt(userOp.maxFeePerGas),
    maxPriorityFeePerGas: BigInt(userOp.maxPriorityFeePerGas),
    signature: "0x",
    ...(userOp.paymaster && isAddress(userOp.paymaster) ? { paymaster: getAddress(userOp.paymaster) } : {}),
    ...(userOp.paymasterData && isHex(userOp.paymasterData) ? { paymasterData: userOp.paymasterData } : {}),
    ...(userOp.paymasterVerificationGasLimit
      ? { paymasterVerificationGasLimit: BigInt(userOp.paymasterVerificationGasLimit) }
      : {}),
    ...(userOp.paymasterPostOpGasLimit
      ? { paymasterPostOpGasLimit: BigInt(userOp.paymasterPostOpGasLimit) }
      : {}),
    ...(userOp.factory && isAddress(userOp.factory) ? { factory: getAddress(userOp.factory) } : {}),
    ...(userOp.factoryData && isHex(userOp.factoryData) ? { factoryData: userOp.factoryData } : {}),
  };
}

export function hashUserOp(chainId: number, userOp: UserOpBody): Hex {
  return getUserOperationHash({
    chainId,
    entryPointAddress: entryPoint07Address,
    entryPointVersion: "0.7",
    userOperation: parseUserOp(userOp),
  });
}

const PRIVY_RPC = /^https:\/\/api\.privy\.io\/v1\/wallets\/[^/]+\/rpc$/;

/** Refuse to sign a Privy payload that is not this user operation. */
export function assertQuorumAuthorization(input: {
  authorization: Record<string, unknown>;
  userOp: UserOpBody;
  userOpHash: Hex;
  smartWallet: Address;
  chainId: number;
}): void {
  const authorization = input.authorization;
  const body = authorization.body;
  const params =
    body && typeof body === "object" ? (body as { method?: unknown; params?: { hash?: unknown } }).params : undefined;
  const method = body && typeof body === "object" ? (body as { method?: unknown }).method : undefined;
  const hash = typeof params?.hash === "string" ? params.hash : "";
  const localHash = hashUserOp(input.chainId, input.userOp);
  if (
    authorization.method !== "POST" ||
    typeof authorization.url !== "string" ||
    !PRIVY_RPC.test(authorization.url) ||
    method !== "secp256k1_sign" ||
    hash !== localHash ||
    hash !== input.userOpHash ||
    !isAddress(input.userOp.sender) ||
    getAddress(input.userOp.sender) !== getAddress(input.smartWallet)
  ) {
    throw new Error("Refusing to sign this authorization");
  }
}
