import {
  concatHex,
  getAddress,
  hashTypedData,
  isAddress,
  type Address,
  type Hex,
} from "viem";
import type { TicketFields } from "./contract.js";

export const KERNEL_DOMAIN_NAME = "Kernel";
export const KERNEL_DOMAIN_VERSION = "0.3.1";
/** ECDSA validator for Kernel >= 0.3.1. Prefixes the owner signature. */
export const KERNEL_ECDSA_VALIDATOR = "0x845ADb2C711129d4f3966735eD98a9F09fC4cE57" as Address;

const PRIVY_RPC = /^https:\/\/api\.privy\.io\/v1\/wallets\/[^/]+\/rpc$/;

const TICKET_TYPES = {
  Ticket: [
    { name: "partyA", type: "string" },
    { name: "partyB", type: "string" },
    { name: "proposition", type: "string" },
    { name: "partyAPosition", type: "string" },
    { name: "partyBPosition", type: "string" },
    { name: "partyAStake", type: "uint256" },
    { name: "partyBStake", type: "uint256" },
    { name: "total", type: "uint256" },
    { name: "price", type: "string" },
    { name: "terms", type: "string" },
  ],
} as const;

const KERNEL_TYPES: { [key: string]: { name: string; type: string }[] } = {
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
  ],
  Kernel: [{ name: "hash", type: "bytes32" }],
};

export type KernelDomain = {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: Address;
};

export type KernelSignTypedData = {
  domain: KernelDomain;
  types: { [key: string]: { name: string; type: string }[] };
  primary_type: "Kernel";
  message: { hash: Hex };
};

export function kernelDomain(chainId: number, wallet: Address): KernelDomain {
  return {
    name: KERNEL_DOMAIN_NAME,
    version: KERNEL_DOMAIN_VERSION,
    chainId,
    verifyingContract: getAddress(wallet),
  };
}

export function sameKernelDomain(left: KernelDomain, right: KernelDomain): boolean {
  return (
    left.name === right.name &&
    left.version === right.version &&
    left.chainId === right.chainId &&
    getAddress(left.verifyingContract) === getAddress(right.verifyingContract)
  );
}

function ticketMessage(fields: TicketFields) {
  return {
    partyA: fields.partyA,
    partyB: fields.partyB,
    proposition: fields.proposition,
    partyAPosition: fields.partyAPosition,
    partyBPosition: fields.partyBPosition,
    partyAStake: BigInt(fields.partyAStake),
    partyBStake: BigInt(fields.partyBStake),
    total: BigInt(fields.total),
    price: fields.price,
    terms: fields.terms,
  };
}

/** EIP-712 digest of the ten fields. This is the hash `isValidSignature` checks. */
export function ticketDigest(fields: TicketFields, chainId: number): Hex {
  return hashTypedData({
    domain: { name: "Spitshake", version: "0.10", chainId },
    types: TICKET_TYPES,
    primaryType: "Ticket",
    message: ticketMessage(fields),
  });
}

/** Typed data the Kernel owner signs. The message hash is the ticket digest. */
export function kernelSignTypedData(digest: Hex, chainId: number, wallet: Address): KernelSignTypedData {
  return {
    domain: kernelDomain(chainId, wallet),
    types: KERNEL_TYPES,
    primary_type: "Kernel",
    message: { hash: digest },
  };
}

export function wrapKernelSignature(ownerSignature: Hex): Hex {
  return concatHex([KERNEL_ECDSA_VALIDATOR, ownerSignature]);
}

function typedDataOf(authorization: Record<string, unknown>): unknown {
  const body = authorization.body;
  if (!body || typeof body !== "object") return undefined;
  const params = (body as { params?: unknown }).params;
  if (!params || typeof params !== "object") return undefined;
  return (params as { typed_data?: unknown }).typed_data;
}

/** Refuse to sign a Privy payload that is not this ticket's Kernel wrap. */
export function assertTicketAuthorization(input: {
  authorization: Record<string, unknown>;
  fields: TicketFields;
  chainId: number;
  smartWallet: Address;
}): void {
  const authorization = input.authorization;
  const body = authorization.body;
  const method = body && typeof body === "object" ? (body as { method?: unknown }).method : undefined;
  const digest = ticketDigest(input.fields, input.chainId);
  const expected = kernelSignTypedData(digest, input.chainId, input.smartWallet);
  const posted = typedDataOf(authorization);
  if (
    authorization.method !== "POST" ||
    typeof authorization.url !== "string" ||
    !PRIVY_RPC.test(authorization.url) ||
    !isAddress(input.smartWallet) ||
    method !== "eth_signTypedData_v4" ||
    JSON.stringify(posted) !== JSON.stringify(expected)
  ) {
    throw new Error("Refusing to sign this authorization");
  }
}
