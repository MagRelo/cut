import { getAddress, type Address, type Hex } from "viem";
import type { UserOperation } from "viem/account-abstraction";

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
