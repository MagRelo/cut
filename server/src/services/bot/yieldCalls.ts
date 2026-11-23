import {
  concatHex,
  createPublicClient,
  encodeFunctionData,
  getAddress,
  http,
  zeroAddress,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { addressToEmptyAccount, createKernelAccount, KernelV3_1AccountAbi } from "@zerodev/sdk";
import { KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { serializePermissionAccount, toPermissionValidator } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import { toSudoPolicy } from "@zerodev/permissions/policies";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { getChainConfig } from "../../lib/chainConfig.js";
import type { BotCall } from "./botCalls.js";

const entryPoint = { address: entryPoint07Address, version: "0.7" as const };
const ECDSA_VALIDATOR = getAddress("0x845ADb2C711129d4f3966735eD98a9F09fC4cE57");

/**
 * Rotate the root to `embedded` and serialize the yielding key as an already
 * installed session key. The user operation that carries `calls` must be enable
 * mode: `installValidations` does not grant the execute selector, and a later
 * sponsored call from this key reverts until that selector is set.
 */
export async function buildYieldCalls(input: {
  chainId: number;
  owner: Address;
  smartWallet: Address;
  embedded: Address;
}): Promise<{ calls: BotCall[]; approval: string; permissionId: Hex }> {
  const chainConfig = getChainConfig(input.chainId);
  const publicClient = createPublicClient({
    chain: chainConfig.chain,
    transport: http(chainConfig.rpcUrl),
  }) as PublicClient;
  const signer = await toECDSASigner({ signer: addressToEmptyAccount(input.owner) });
  const plugin = await toPermissionValidator(publicClient, {
    entryPoint,
    kernelVersion: KERNEL_V3_1,
    signer,
    policies: [toSudoPolicy({})],
  });
  const permissionId = plugin.getIdentifier();
  const root = concatHex(["0x01", ECDSA_VALIDATOR]);
  const rotate: BotCall = {
    to: input.smartWallet,
    value: 0n,
    data: encodeFunctionData({
      abi: KernelV3_1AccountAbi,
      functionName: "changeRootValidator",
      args: [root, zeroAddress, getAddress(input.embedded), "0x"],
    }),
  };
  const sudo = await signerToEcdsaValidator(publicClient, {
    signer: addressToEmptyAccount(input.embedded),
    entryPoint,
    kernelVersion: KERNEL_V3_1,
  });
  const account = await createKernelAccount(publicClient, {
    entryPoint,
    kernelVersion: KERNEL_V3_1,
    address: input.smartWallet,
    plugins: { sudo },
  });
  const approval = await serializePermissionAccount(
    account,
    undefined,
    undefined,
    undefined,
    plugin,
  );
  return { calls: [rotate], approval, permissionId };
}
