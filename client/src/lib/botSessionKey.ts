import {
  concatHex,
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  http,
  pad,
  zeroAddress,
  type Address,
  type Chain,
  type EIP1193Provider,
  type Hex,
} from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { addressToEmptyAccount, createKernelAccount, KernelV3_1AccountAbi } from "@zerodev/sdk";
import { KERNEL_V3_1, VALIDATOR_TYPE } from "@zerodev/sdk/constants";
import { serializePermissionAccount, toPermissionValidator } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import { toSudoPolicy } from "@zerodev/permissions/policies";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";

const entryPoint = { address: entryPoint07Address, version: "0.7" as const };

export type WalletCall = {
  to: Address;
  data: Hex;
};

export type PreparedSessionKey = {
  approval: string;
  permissionId: Hex;
  call: WalletCall;
};

function publicClientFor(chain: Chain) {
  const url =
    chain.id === 8453
      ? import.meta.env.VITE_BASE_RPC_URL?.trim()
      : chain.id === 84532
        ? import.meta.env.VITE_BASE_SEPOLIA_RPC_URL?.trim()
        : undefined;
  return createPublicClient({ chain, transport: url ? http(url) : http() });
}

async function permissionFor(chain: Chain, delegateAddress: Address) {
  const publicClient = publicClientFor(chain);
  const signer = await toECDSASigner({ signer: addressToEmptyAccount(delegateAddress) });
  const plugin = await toPermissionValidator(publicClient, {
    entryPoint,
    kernelVersion: KERNEL_V3_1,
    signer,
    policies: [toSudoPolicy({})],
  });
  return { publicClient, plugin, permissionId: plugin.getIdentifier() };
}

function validationId(permissionId: Hex): Hex {
  return concatHex([VALIDATOR_TYPE.PERMISSION, pad(permissionId, { size: 20, dir: "right" })]);
}

/** A call the embedded owner sends through Privy. Privy sponsors it. */
async function installCall(
  smartWallet: Address,
  plugin: Awaited<ReturnType<typeof toPermissionValidator>>,
  permissionId: Hex,
): Promise<WalletCall> {
  return {
    to: smartWallet,
    data: encodeFunctionData({
      abi: KernelV3_1AccountAbi,
      functionName: "installValidations",
      args: [
        [validationId(permissionId)],
        [{ nonce: 0, hook: zeroAddress }],
        [await plugin.getEnableData(smartWallet)],
        ["0x"],
      ],
    }),
  };
}

async function uninstallCall(
  smartWallet: Address,
  plugin: Awaited<ReturnType<typeof toPermissionValidator>>,
  permissionId: Hex,
): Promise<WalletCall> {
  return {
    to: smartWallet,
    data: encodeFunctionData({
      abi: KernelV3_1AccountAbi,
      functionName: "uninstallValidation",
      args: [validationId(permissionId), await plugin.getEnableData(smartWallet), "0x"],
    }),
  };
}

function assertInstalledApproval(approval: string) {
  const bytes = Uint8Array.from(atob(approval), (char) => char.charCodeAt(0));
  const parsed = JSON.parse(new TextDecoder().decode(bytes)) as { isPreInstalled?: unknown };
  if (parsed.isPreInstalled !== true) {
    throw new Error("Session key was not prepared as an installed key");
  }
}

/**
 * Build the session key and the wallet call that installs it.
 * The caller sends `call` with the Privy smart wallet so gas uses the existing sponsorship policy.
 */
export async function prepareBotSessionKey(input: {
  chain: Chain;
  owner: EIP1193Provider;
  ownerAddress: Address;
  smartWallet: Address;
  delegateAddress: Address;
}): Promise<PreparedSessionKey> {
  const { publicClient, plugin, permissionId } = await permissionFor(
    input.chain,
    input.delegateAddress,
  );
  const ownerClient = createWalletClient({
    account: input.ownerAddress,
    chain: input.chain,
    transport: custom(input.owner),
  });
  const sudo = await signerToEcdsaValidator(publicClient, {
    signer: ownerClient,
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
  assertInstalledApproval(approval);
  return {
    approval,
    permissionId,
    call: await installCall(input.smartWallet, plugin, permissionId),
  };
}

/** Build the wallet call that removes the session key. */
export async function prepareBotSessionRevoke(input: {
  chain: Chain;
  smartWallet: Address;
  delegateAddress: Address;
}): Promise<WalletCall> {
  const { plugin, permissionId } = await permissionFor(input.chain, input.delegateAddress);
  return uninstallCall(input.smartWallet, plugin, permissionId);
}
