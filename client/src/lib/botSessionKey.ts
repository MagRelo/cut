import {
  concatHex,
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  getAddress,
  http,
  pad,
  zeroAddress,
  type Address,
  type Chain,
  type EIP1193Provider,
  type Hex,
  type PublicClient,
} from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { addressToEmptyAccount, createKernelAccount, KernelV3_1AccountAbi } from "@zerodev/sdk";
import { KERNEL_V3_1, VALIDATOR_TYPE } from "@zerodev/sdk/constants";
import { serializePermissionAccount, toPermissionValidator } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { delegatePolicies } from "./botDelegatePolicy";

const entryPoint = { address: entryPoint07Address, version: "0.7" as const };

export type WalletCall = {
  to: Address;
  data: Hex;
};

export type PreparedSessionKey = {
  approval: string;
  permissionId: Hex;
  /** Set when a revoked key must be installed again. The first approval is a signature and has no call. */
  call: WalletCall | null;
};

/** ZeroDev ECDSA signer used by a permission session key. */
const ECDSA_SIGNER = getAddress("0x6A6F069E2a08c2468e7724Ab3250CdBFBA14D4FF");

function publicClientFor(chain: Chain) {
  const url =
    chain.id === 8453
      ? import.meta.env.VITE_BASE_RPC_URL?.trim()
      : chain.id === 84532
        ? import.meta.env.VITE_BASE_SEPOLIA_RPC_URL?.trim()
        : undefined;
  return createPublicClient({ chain, transport: url ? http(url) : http() });
}

/**
 * The delegate's permission: Cut's NoSelfCallPolicy (any call except into the wallet itself,
 * the EntryPoint, or a module's onInstall/onUninstall; no ERC-1271 signatures). The permission
 * id depends on the policy address, so a new ContestFactory (new policy) is a new key slot.
 */
async function permissionFor(chain: Chain, delegateAddress: Address, policyAddress: Address) {
  const publicClient = publicClientFor(chain);
  const signer = await toECDSASigner({ signer: addressToEmptyAccount(delegateAddress) });
  const plugin = await toPermissionValidator(publicClient, {
    entryPoint,
    kernelVersion: KERNEL_V3_1,
    signer,
    policies: delegatePolicies(policyAddress),
  });
  return { publicClient, plugin, permissionId: plugin.getIdentifier() };
}

function validationId(permissionId: Hex): Hex {
  return concatHex([VALIDATOR_TYPE.PERMISSION, pad(permissionId, { size: 20, dir: "right" })]);
}

type PermissionState = "fresh" | "active" | "revoked";

/**
 * Kernel accepts an install only when the config nonce equals `currentNonce`,
 * after it bumps that counter for a validator that was already installed at it.
 * Nonce 0 reverts `InvalidNonce()`.
 */
async function installNonce(
  publicClient: PublicClient,
  smartWallet: Address,
  vId: Hex,
): Promise<number> {
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

async function permissionState(
  publicClient: PublicClient,
  smartWallet: Address,
  permissionId: Hex,
): Promise<PermissionState> {
  const vId = validationId(permissionId);
  const [permission, config] = await Promise.all([
    publicClient.readContract({
      address: smartWallet,
      abi: KernelV3_1AccountAbi,
      functionName: "permissionConfig",
      args: [permissionId],
    }),
    publicClient.readContract({
      address: smartWallet,
      abi: KernelV3_1AccountAbi,
      functionName: "validationConfig",
      args: [vId],
    }),
  ]);
  if (getAddress(permission.signer) === ECDSA_SIGNER) return "active";
  return Number(config.nonce) === 0 ? "fresh" : "revoked";
}

/** A call the embedded owner sends through Privy. Privy sponsors it. */
async function installCall(
  publicClient: PublicClient,
  smartWallet: Address,
  plugin: Awaited<ReturnType<typeof toPermissionValidator>>,
  permissionId: Hex,
): Promise<WalletCall> {
  const vId = validationId(permissionId);
  return {
    to: smartWallet,
    data: encodeFunctionData({
      abi: KernelV3_1AccountAbi,
      functionName: "installValidations",
      args: [
        [vId],
        [{ nonce: await installNonce(publicClient, smartWallet, vId), hook: zeroAddress }],
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

function assertApproval(approval: string) {
  const bytes = Uint8Array.from(atob(approval), (char) => char.charCodeAt(0));
  const parsed = JSON.parse(new TextDecoder().decode(bytes)) as {
    isPreInstalled?: unknown;
    enableSignature?: unknown;
  };
  if (parsed.isPreInstalled === true) return;
  if (
    typeof parsed.enableSignature === "string" &&
    /^0x[0-9a-fA-F]+$/.test(parsed.enableSignature)
  ) {
    return;
  }
  throw new Error("Session key approval is missing an enable signature");
}

/**
 * Build the session key.
 * A new key asks the owner to sign Kernel's enable digest. That signature installs the key
 * and grants `execute` on the first join or leave. Kernel 3.1 has no separate selector grant,
 * and `installValidations` does not set one. A key that was revoked is installed again with
 * the wallet's current nonce, because the selector from the first install is still allowed.
 */
export async function prepareBotSessionKey(input: {
  chain: Chain;
  owner: EIP1193Provider;
  ownerAddress: Address;
  smartWallet: Address;
  delegateAddress: Address;
  /** From `GET /api/bot/delegate-policy` (ContestFactory.delegatePolicy()). */
  policyAddress: Address;
}): Promise<PreparedSessionKey> {
  const { publicClient, plugin, permissionId } = await permissionFor(
    input.chain,
    input.delegateAddress,
    input.policyAddress,
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
  const state = await permissionState(publicClient, input.smartWallet, permissionId);
  if (state === "fresh") {
    const approval = await serializePermissionAccount(
      account,
      undefined,
      undefined,
      undefined,
      plugin,
      true,
    );
    assertApproval(approval);
    return { approval, permissionId, call: null };
  }
  const approval = await serializePermissionAccount(
    account,
    undefined,
    undefined,
    undefined,
    plugin,
  );
  assertApproval(approval);
  return {
    approval,
    permissionId,
    call:
      state === "revoked"
        ? await installCall(publicClient, input.smartWallet, plugin, permissionId)
        : null,
  };
}

/**
 * Build the wallet call that removes the session key. Null when it was never installed.
 * `policyAddress` is the stored one from `GET /api/bot/delegates`, so the same permission is
 * rebuilt.
 */
export async function prepareBotSessionRevoke(input: {
  chain: Chain;
  smartWallet: Address;
  delegateAddress: Address;
  policyAddress: Address;
}): Promise<WalletCall | null> {
  const { publicClient, plugin, permissionId } = await permissionFor(
    input.chain,
    input.delegateAddress,
    input.policyAddress,
  );
  const state = await permissionState(publicClient, input.smartWallet, permissionId);
  if (state !== "active") return null;
  return uninstallCall(input.smartWallet, plugin, permissionId);
}
