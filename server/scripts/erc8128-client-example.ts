#!/usr/bin/env tsx
/**
 * ERC-8128 Reference Client for Play The Cut Bot API
 *
 * This script demonstrates how to sign requests using ERC-8128 HTTP Message Signatures.
 *
 * ERC-8128 spec version: draft-2026-01-16
 * @see https://erc8128.slice.so/
 *
 * Usage:
 *   ERC8128_PRIVATE_KEY=0x... tsx server/scripts/erc8128-client-example.ts
 *
 * Environment variables:
 *   ERC8128_PRIVATE_KEY - Delegate private key (hex with 0x prefix)
 *   ERC8128_SMART_WALLET - Smart wallet address
 *   ERC8128_CHAIN_ID - Chain ID (8453 for Base, 84532 for Base Sepolia)
 *   ERC8128_API_BASE - API base URL (default: http://localhost:3000)
 */

import { hashMessage, keccak256, toBytes, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const PRIVATE_KEY = process.env.ERC8128_PRIVATE_KEY as Hex;
const SMART_WALLET = process.env.ERC8128_SMART_WALLET as Address;
const CHAIN_ID = parseInt(process.env.ERC8128_CHAIN_ID || "84532", 10);
const API_BASE = process.env.ERC8128_API_BASE || "http://localhost:3000";

if (!PRIVATE_KEY) {
  console.error("Error: ERC8128_PRIVATE_KEY environment variable required");
  process.exit(1);
}
if (!SMART_WALLET) {
  console.error("Error: ERC8128_SMART_WALLET environment variable required");
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY);

/**
 * Compute content-digest header value using keccak256 (matching server implementation).
 */
function computeContentDigest(body: string): string {
  const hash = keccak256(toBytes(body)).slice(2);
  const base64 = Buffer.from(hash, "hex").toString("base64");
  return `sha-256=:${base64}:`;
}

/**
 * Build the RFC 9421 signature base.
 */
function buildSignatureBase(
  components: string[],
  values: Record<string, string>,
  sigInputWithoutLabel: string,
): string {
  const lines = components.map((c) => `"${c}": ${values[c]}`);
  lines.push(`"@signature-params": ${sigInputWithoutLabel}`);
  return lines.join("\n");
}

/**
 * Sign an HTTP request using ERC-8128.
 */
async function signRequest(input: {
  method: string;
  authority: string;
  path: string;
  query?: string;
  body?: string;
  nonce?: string;
  ttlSeconds?: number;
}): Promise<{
  signatureInput: string;
  signature: string;
  contentDigest?: string;
}> {
  const now = Math.floor(Date.now() / 1000);
  const ttl = input.ttlSeconds ?? 60;

  const components: string[] = ["@method", "@authority", "@path"];
  const values: Record<string, string> = {
    "@method": input.method.toUpperCase(),
    "@authority": input.authority,
    "@path": input.path,
  };

  if (input.query) {
    components.push("@query");
    values["@query"] = input.query;
  }

  let contentDigest: string | undefined;
  if (input.body) {
    contentDigest = computeContentDigest(input.body);
    components.push("content-digest");
    values["content-digest"] = contentDigest;
  }

  const keyid = `eip8128:${CHAIN_ID}:${account.address.toLowerCase()}`;
  let paramsStr = `;created=${now};expires=${now + ttl}`;
  if (input.nonce) {
    paramsStr += `;nonce="${input.nonce}"`;
  }
  paramsStr += `;keyid="${keyid}"`;

  const componentsList = components.map((c) => `"${c}"`).join(" ");
  const sigInputWithoutLabel = `(${componentsList})${paramsStr}`;
  const signatureInput = `eth=${sigInputWithoutLabel}`;

  const sigBase = buildSignatureBase(components, values, sigInputWithoutLabel);
  const sig = await account.signMessage({ message: { raw: toBytes(sigBase) } });
  const signature = `eth=:${Buffer.from(sig.slice(2), "hex").toString("base64")}:`;

  return { signatureInput, signature, contentDigest };
}

/**
 * List contests using ERC-8128 signed read.
 */
async function listContests(): Promise<void> {
  console.log("\n=== List Contests (ERC-8128 signed read) ===\n");

  const url = new URL(`${API_BASE}/api/bot/contests`);
  url.searchParams.set("smartWallet", SMART_WALLET);

  const authority = url.host;
  const path = url.pathname;
  const query = url.search;

  // Reads don't need a nonce
  const { signatureInput, signature } = await signRequest({
    method: "GET",
    authority,
    path,
    query,
  });

  console.log("Request:");
  console.log(`  GET ${url}`);
  console.log(`  Signature-Input: ${signatureInput}`);
  console.log(`  Signature: ${signature.slice(0, 50)}...`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Signature-Input": signatureInput,
      Signature: signature,
    },
  });

  const data = await response.json();
  console.log("\nResponse:", response.status);
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Create a lineup using ERC-8128 signed write.
 */
async function createLineup(contestId: string, picks: string[]): Promise<void> {
  console.log("\n=== Create Lineup (ERC-8128 signed write) ===\n");

  const url = new URL(`${API_BASE}/api/bot/actions`);
  const body = JSON.stringify({
    chainId: CHAIN_ID,
    action: "lineupUpsert",
    smartWallet: SMART_WALLET,
    contestId,
    lineupId: "",
    candidates: picks,
  });

  // Generate unique nonce for write actions
  const nonce = crypto.randomUUID();

  const { signatureInput, signature, contentDigest } = await signRequest({
    method: "POST",
    authority: url.host,
    path: url.pathname,
    body,
    nonce, // Required for writes
  });

  console.log("Request:");
  console.log(`  POST ${url}`);
  console.log(`  Content-Digest: ${contentDigest}`);
  console.log(`  Signature-Input: ${signatureInput}`);
  console.log(`  Signature: ${signature.slice(0, 50)}...`);
  console.log(`  Body: ${body}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Digest": contentDigest!,
      "Signature-Input": signatureInput,
      Signature: signature,
    },
    body,
  });

  const data = await response.json();
  console.log("\nResponse:", response.status);
  console.log(JSON.stringify(data, null, 2));
}

async function main(): Promise<void> {
  console.log("ERC-8128 Reference Client for Play The Cut");
  console.log("==========================================");
  console.log(`Signer: ${account.address}`);
  console.log(`Smart Wallet: ${SMART_WALLET}`);
  console.log(`Chain ID: ${CHAIN_ID}`);
  console.log(`API Base: ${API_BASE}`);

  const args = process.argv.slice(2);

  if (args[0] === "contests") {
    await listContests();
  } else if (args[0] === "lineup" && args[1] && args[2]) {
    await createLineup(args[1], args.slice(2));
  } else {
    console.log("\nUsage:");
    console.log("  tsx server/scripts/erc8128-client-example.ts contests");
    console.log("  tsx server/scripts/erc8128-client-example.ts lineup <contestId> <pick1> [pick2...]");
  }
}

main().catch(console.error);
