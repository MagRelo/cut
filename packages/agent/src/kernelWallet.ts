import {
  concat,
  encodeFunctionData,
  getAddress,
  getCreate2Address,
  isAddress,
  keccak256,
  toHex,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";

/**
 * Kernel v3.1 on EntryPoint 0.7. The factory and init-code hash are the same
 * on Base and Base Sepolia. The address is the kernel factory's CREATE2 of an
 * ECDSA-owned account at index 0, which is what `createKernelAccount` deploys.
 */
const SUPPORTED_CHAINS = new Set([8453, 84532]);
const ECDSA_VALIDATOR = "0x845ADb2C711129d4f3966735eD98a9F09fC4cE57";
const KERNEL_FACTORY = "0xaac5D4240AF87249B3f71BC8E4A2cae074A3E419";
const INIT_CODE_HASH =
  "0x85d96aa1c9a65886d094915d76ccae85f14027a02c1647dde659f869460f03e6" as Hex;
const SECONDARY_VALIDATOR = "0x01" as Hex;

const initializeAbi = [
  {
    type: "function",
    name: "initialize",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_rootValidator", type: "bytes21" },
      { name: "hook", type: "address" },
      { name: "validatorData", type: "bytes" },
      { name: "hookData", type: "bytes" },
      { name: "initConfig", type: "bytes[]" },
    ],
    outputs: [],
  },
] as const;

/** Kernel smart account owned by `owner` on Base or Base Sepolia. */
export function kernelWalletAddress(owner: Address, chainId: number): Address {
  if (!SUPPORTED_CHAINS.has(chainId)) {
    throw new Error("Chain is not supported");
  }
  if (!isAddress(owner)) {
    throw new Error("Invalid owner");
  }
  const rootValidator = concat([SECONDARY_VALIDATOR, getAddress(ECDSA_VALIDATOR)]);
  const initData = encodeFunctionData({
    abi: initializeAbi,
    functionName: "initialize",
    args: [rootValidator, zeroAddress, getAddress(owner), "0x", []],
  });
  const salt = keccak256(concat([initData, toHex(0n, { size: 32 })]));
  return getCreate2Address({
    from: KERNEL_FACTORY,
    salt,
    bytecodeHash: INIT_CODE_HASH,
  });
}
