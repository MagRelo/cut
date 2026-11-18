import {
  concatHex,
  createPublicClient,
  encodeFunctionData,
  getAddress,
  http,
  pad,
  zeroAddress,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { addressToEmptyAccount, createKernelAccount, KernelV3_1AccountAbi } from "@zerodev/sdk";
import { KERNEL_V3_1, VALIDATOR_TYPE } from "@zerodev/sdk/constants";
import { serializePermissionAccount, toPermissionValidator } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import { toSudoPolicy } from "@zerodev/permissions/policies";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { getChainConfig } from "../../lib/chainConfig.js";
import type { BotCall } from "./botCalls.js";

const entryPoint = { address: entryPoint07Address, version: "0.7" as const };
const ECDSA_VALIDATOR = getAddress("0x845ADb2C711129d4f3966735eD98a9F09fC4cE57");

function validationId(permissionId: Hex): Hex {
  return concatHex([VALIDATOR_TYPE.PERMISSION, pad(permissionId, { size: 20, dir: "right" })]);
}

async function installNonce(
  publicClient: PublicClient,
  smartWallet: Address,
  vId: Hex,
): Promise<number> {
  const code = await publicClient.getBytecode({ address: smartWallet });
  if (!code || code === "0x") return 1;
  const current = await publicClient.readContract({
    address: smartWallet,
    abi: KernelV3_1AccountAbi,
    functionName: "currentNonce",
  });
  const config = await publicClient.readContract({
    address: smartWallet,
    abi: KernelV3_1AccountAbi,
    functionName: "validationConfig",
    args: [vId],
  });
  const now = Number(current);
  const stored = Number(config.nonce);
  return stored === now ? now + 1 : now;
}

/** Install the current owner as a sudo session key, then make `embedded` the root. */
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
  const vId = validationId(permissionId);
  const nonce = await installNonce(publicClient, input.smartWallet, vId);
  const install: BotCall = {
    to: input.smartWallet,
    value: 0n,
    data: encodeFunctionData({
      abi: KernelV3_1AccountAbi,
      functionName: "installValidations",
      args: [
        [vId],
        [{ nonce, hook: zeroAddress }],
        [await plugin.getEnableData(input.smartWallet)],
        ["0x"],
      ],
    }),
  };
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
    signer: addressToEmptyAccount(input.owner),
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
  return { calls: [install, rotate], approval, permissionId };
}
