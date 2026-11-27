import {
  isDelegatePublicKey,
  kernelDomain,
  kernelSignTypedData,
  sameKernelDomain,
  ticketDigest,
  verifyPayload,
  wrapKernelSignature,
  type KernelDomain,
  type KernelSignTypedData,
} from "@playthecut/agent";
import type { TicketFields } from "@playthecut/agent/contract";
import { getAddress, isAddress, isHex, type Address, type Hex } from "viem";
import { getPrivyClient } from "../../lib/privyClient.js";
import { clientSafeErrorMessage } from "../../utils/clientSafeError.js";
import { getPublicClient } from "../shared/contractClient.js";
import type { BotDelegateRow } from "./executeBotAction.js";
import { readQuorumApproval, type QuorumApproval } from "./quorumApproval.js";

const PRIVY_API = "https://api.privy.io";
const ERC1271_MAGIC = "0x1626ba7e";

const eip712DomainAbi = [
  {
    type: "function",
    name: "eip712Domain",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "fields", type: "bytes1" },
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
      { name: "salt", type: "bytes32" },
      { name: "extensions", type: "uint256[]" },
    ],
  },
] as const;

const isValidSignatureAbi = [
  {
    type: "function",
    name: "isValidSignature",
    stateMutability: "view",
    inputs: [
      { name: "hash", type: "bytes32" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [{ name: "magicValue", type: "bytes4" }],
  },
] as const;

export type SignTicketInput = {
  chainId: number;
  smartWallet: string;
  signer: string;
  fields: TicketFields;
  authorizationSignature?: string;
};

export type SignTicketResult =
  | { ok: true; prepared: true; hash: Hex; authorization: Record<string, unknown> }
  | { ok: true; wallet: Address; hash: Hex; signature: Hex; prepared?: undefined }
  | { ok: false; status: 400 | 401 | 403 | 502 | 503; error: string };

export type VerifyTicketInput = {
  chainId: number;
  wallet: string;
  fields: TicketFields;
  signature: string;
};

export type VerifyTicketResult = { ok: true; valid: boolean } | { ok: false; status: 400 | 502; error: string };

export type SignTicketDeps = {
  findDelegate: (smartWallet: Address, signer: string) => Promise<BotDelegateRow | null>;
  readDomain: (wallet: Address, chainId: number) => Promise<KernelDomain | null>;
  signTypedData: (input: {
    embeddedWalletId: string;
    typedData: KernelSignTypedData;
    authorizationSignature: string;
  }) => Promise<Hex>;
};

export type VerifyTicketDeps = {
  isValidSignature: (wallet: Address, hash: Hex, signature: Hex, chainId: number) => Promise<Hex | "unavailable">;
};

export function ticketAuthorization(embeddedWalletId: string, appId: string, typedData: KernelSignTypedData) {
  return {
    version: 1 as const,
    method: "POST" as const,
    url: `${PRIVY_API}/v1/wallets/${embeddedWalletId}/rpc`,
    body: {
      method: "eth_signTypedData_v4" as const,
      params: { typed_data: typedData },
    },
    headers: { "privy-app-id": appId },
  };
}

function enabledApproval(
  delegate: BotDelegateRow,
): { ok: true; approval: QuorumApproval } | { ok: false; status: 400; error: string } {
  const approval = readQuorumApproval(delegate.approval);
  if (!approval) return { ok: false, status: 400, error: "Invalid delegate approval" };
  return { ok: true, approval };
}

export async function signTicket(input: SignTicketInput, deps: SignTicketDeps): Promise<SignTicketResult> {
  if (!isAddress(input.smartWallet)) return { ok: false, status: 400, error: "Invalid wallet address" };
  const smartWallet = getAddress(input.smartWallet);
  if (!isDelegatePublicKey(input.signer)) {
    return { ok: false, status: 403, error: "No active delegate for this signature" };
  }
  const delegate = await deps.findDelegate(smartWallet, input.signer);
  if (!delegate) return { ok: false, status: 403, error: "No active delegate for this signature" };
  const enabled = enabledApproval(delegate);
  if (!enabled.ok) return enabled;
  if (enabled.approval.publicKey !== input.signer) {
    return { ok: false, status: 401, error: "Invalid action signature" };
  }
  const appId = process.env.PRIVY_APP_ID?.trim();
  if (!appId) return { ok: false, status: 503, error: "Privy is not configured" };

  const expected = kernelDomain(input.chainId, smartWallet);
  const read = await deps.readDomain(smartWallet, input.chainId);
  if (read && !sameKernelDomain(read, expected)) {
    return { ok: false, status: 502, error: "This wallet cannot sign a ticket" };
  }

  const hash = ticketDigest(input.fields, input.chainId);
  const typedData = kernelSignTypedData(hash, input.chainId, smartWallet);
  const authorization = ticketAuthorization(enabled.approval.embeddedWalletId, appId, typedData);

  if (!input.authorizationSignature) {
    return { ok: true, prepared: true, hash, authorization };
  }
  if (!verifyPayload(enabled.approval.publicKey, authorization, input.authorizationSignature)) {
    return { ok: false, status: 401, error: "Invalid action signature" };
  }

  let ownerSignature: Hex;
  try {
    ownerSignature = await deps.signTypedData({
      embeddedWalletId: enabled.approval.embeddedWalletId,
      typedData,
      authorizationSignature: input.authorizationSignature,
    });
  } catch (error) {
    return { ok: false, status: 502, error: clientSafeErrorMessage(error, "Privy did not sign the ticket") };
  }
  if (!isHex(ownerSignature)) return { ok: false, status: 502, error: "Privy did not return a signature" };
  return { ok: true, wallet: smartWallet, hash, signature: wrapKernelSignature(ownerSignature) };
}

export async function verifyTicket(input: VerifyTicketInput, deps: VerifyTicketDeps): Promise<VerifyTicketResult> {
  if (!isAddress(input.wallet)) return { ok: false, status: 400, error: "Invalid wallet address" };
  if (!isHex(input.signature)) return { ok: false, status: 400, error: "Invalid signature" };
  const wallet = getAddress(input.wallet);
  const hash = ticketDigest(input.fields, input.chainId);
  const magic = await deps.isValidSignature(wallet, hash, input.signature, input.chainId);
  if (magic === "unavailable") return { ok: false, status: 502, error: "Could not verify the ticket" };
  return { ok: true, valid: magic.toLowerCase() === ERC1271_MAGIC };
}

export async function readKernelDomain(wallet: Address, chainId: number): Promise<KernelDomain | null> {
  try {
    const domain = await getPublicClient(chainId).readContract({
      address: wallet,
      abi: eip712DomainAbi,
      functionName: "eip712Domain",
    });
    if (!isAddress(domain[4])) return null;
    return {
      name: domain[1],
      version: domain[2],
      chainId: Number(domain[3]),
      verifyingContract: getAddress(domain[4]),
    };
  } catch {
    return null;
  }
}

export async function readTicketSignature(
  wallet: Address,
  hash: Hex,
  signature: Hex,
  chainId: number,
): Promise<Hex | "unavailable"> {
  try {
    return await getPublicClient(chainId).readContract({
      address: wallet,
      abi: isValidSignatureAbi,
      functionName: "isValidSignature",
      args: [hash, signature],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/revert|execution reverted|isValidSignature/i.test(message)) return "0xffffffff";
    return "unavailable";
  }
}

export async function privySignTypedData(input: {
  embeddedWalletId: string;
  typedData: KernelSignTypedData;
  authorizationSignature: string;
}): Promise<Hex> {
  const signed = await getPrivyClient().wallets().rpc(input.embeddedWalletId, {
    method: "eth_signTypedData_v4",
    params: { typed_data: input.typedData },
    authorization_context: { signatures: [input.authorizationSignature] },
  });
  const raw = signed.data.signature;
  const hex = raw.startsWith("0x") ? raw : `0x${raw}`;
  if (!isHex(hex)) throw new Error("Privy did not return a signature");
  return hex;
}
