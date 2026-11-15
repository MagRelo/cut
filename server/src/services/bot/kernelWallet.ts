import { getAddress, zeroAddress, type Address } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { getKernelAddressFromECDSA } from "@zerodev/ecdsa-validator";
import { KERNEL_V3_1, KernelVersionToAddressesMap } from "@zerodev/sdk/constants";
import { getPublicClient } from "../shared/contractClient.js";

/**
 * Cut accounts are ZeroDev Kernel v3.1 smart wallets on EntryPoint 0.7 whose sudo
 * validator is the ZeroDev ECDSA validator. The owner is a plain EOA: the Privy
 * embedded wallet for web users, or a key the agent generated for agent-first signup.
 */
export const KERNEL_ENTRY_POINT = { address: entryPoint07Address, version: "0.7" as const };
export const KERNEL_VERSION = KERNEL_V3_1;
export const KERNEL_ECDSA_VALIDATOR = getAddress("0x845ADb2C711129d4f3966735eD98a9F09fC4cE57");
/** Wallet index used by the app. Every Cut wallet is index 0 for its owner. */
export const KERNEL_ACCOUNT_INDEX = 0n;

const INIT_CODE_HASH = KernelVersionToAddressesMap[KERNEL_V3_1].initCodeHash as `0x${string}`;

const ecdsaValidatorAbi = [
  {
    type: "function",
    name: "ecdsaValidatorStorage",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "owner", type: "address" }],
  },
] as const;

/**
 * Counterfactual Kernel v3.1 address for an owner EOA. Pure CREATE2 math, no RPC.
 * The same address on every chain where the ZeroDev factory is deployed.
 */
export async function kernelAddressForOwner(owner: Address): Promise<Address> {
  const address = await getKernelAddressFromECDSA({
    entryPoint: KERNEL_ENTRY_POINT,
    kernelVersion: KERNEL_VERSION,
    eoaAddress: getAddress(owner),
    index: KERNEL_ACCOUNT_INDEX,
    initCodeHash: INIT_CODE_HASH,
  });
  return getAddress(address);
}

export type WalletOwnerReader = {
  /** Bytecode at the address, or undefined/"0x" when nothing is deployed. */
  getCode: (chainId: number, address: Address) => Promise<string | undefined>;
  /** Owner recorded by the ECDSA validator for a deployed wallet (zero when not its validator). */
  readEcdsaOwner: (chainId: number, smartWallet: Address) => Promise<Address>;
};

export const chainWalletOwnerReader: WalletOwnerReader = {
  getCode: async (chainId, address) => getPublicClient(chainId).getCode({ address }),
  readEcdsaOwner: async (chainId, smartWallet) =>
    getAddress(
      await getPublicClient(chainId).readContract({
        address: KERNEL_ECDSA_VALIDATOR,
        abi: ecdsaValidatorAbi,
        functionName: "ecdsaValidatorStorage",
        args: [smartWallet],
      }),
    ),
};

/**
 * True when `signer` owns `smartWallet`.
 *
 * - Deployed wallet: chain is the source of truth. Read the owner the ECDSA validator
 *   stores for the wallet, so an owner rotation on-chain is respected.
 * - Undeployed wallet: the wallet only exists as a counterfactual address, so the
 *   signer owns it exactly when the Kernel CREATE2 address for the signer matches.
 */
export async function isKernelWalletOwner(
  chainId: number,
  smartWallet: Address,
  signer: Address,
  reader: WalletOwnerReader = chainWalletOwnerReader,
): Promise<boolean> {
  const wallet = getAddress(smartWallet);
  const owner = getAddress(signer);
  const code = await reader.getCode(chainId, wallet);
  if (code && code !== "0x") {
    const onchainOwner = await reader.readEcdsaOwner(chainId, wallet);
    return onchainOwner !== zeroAddress && onchainOwner === owner;
  }
  return (await kernelAddressForOwner(owner)) === wallet;
}
