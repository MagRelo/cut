#!/usr/bin/env tsx
/**
 * Play The Cut agent client: the whole flow with ERC-8128 signed requests.
 *
 *   1. Create (or load) a private key. That key owns the account.
 *   2. register (optional refCode). The server returns the Kernel smart wallet to fund.
 *   3. Signed reads: balance, contests (no nonce).
 *   4. Optional: add a delegate session key (delegateAdd, owner only).
 *   5. Optional: lineupUpsert, then join (prepare -> sign userOpHash -> submit).
 *
 * Every write carries a fresh nonce. ERC-8128 spec version: draft-2026-01-16
 * (https://erc8128.slice.so/, RFC 9421 HTTP Message Signatures, RFC 9530 Content-Digest).
 *
 * Usage:
 *   tsx server/scripts/erc8128-client-example.ts
 *
 * Environment:
 *   CUT_PRIVATE_KEY     Owner key (0x hex). Omitted: a new key is generated and printed.
 *   CUT_CHAIN_ID        8453 (Base) or 84532 (Base Sepolia). Default 84532.
 *   CUT_API_BASE        Default http://localhost:3000
 *   CUT_REF_CODE        Optional referral code for register.
 *   CUT_DELEGATE        Optional delegate address to allow (external session key).
 *   CUT_CONTEST_ID      Optional contest to enter.
 *   CUT_CANDIDATES      Comma-separated eventParticipantIds for the lineup.
 *   CUT_RPC_URL         RPC for the delegate step (default: public RPC for the chain).
 */

import { createHash, randomBytes } from "node:crypto";
import { createPublicClient, http, toBytes, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { entryPoint07Address } from "viem/account-abstraction";
import { base, baseSepolia } from "viem/chains";

const CHAIN_ID = Number(process.env.CUT_CHAIN_ID ?? "84532");
const API_BASE = (process.env.CUT_API_BASE ?? "http://localhost:3000").replace(/\/$/, "");

// ---------------------------------------------------------------------------
// ERC-8128 signing
// ---------------------------------------------------------------------------

function contentDigest(body: string): string {
  return `sha-256=:${createHash("sha256").update(body).digest("base64")}:`;
}

function newNonce(): string {
  return randomBytes(16).toString("base64url");
}

async function signedFetch(
  account: PrivateKeyAccount,
  method: "GET" | "POST",
  pathAndQuery: string,
  body?: unknown,
): Promise<{ status: number; json: unknown }> {
  const url = new URL(API_BASE + pathAndQuery);
  const now = Math.floor(Date.now() / 1000);
  const text = body === undefined ? undefined : JSON.stringify(body);

  const components = ["@method", "@authority", "@path"];
  const values: Record<string, string> = {
    "@method": method,
    "@authority": url.host,
    "@path": url.pathname,
  };
  if (url.search) {
    components.push("@query");
    values["@query"] = url.search;
  }
  const headers: Record<string, string> = {};
  if (text !== undefined) {
    const digest = contentDigest(text);
    components.push("content-digest");
    values["content-digest"] = digest;
    headers["content-digest"] = digest;
    headers["content-type"] = "application/json";
  }

  // Writes (POST) need a nonce; reads (GET) are replayable inside their window.
  const nonce = method === "POST" ? `;nonce="${newNonce()}"` : "";
  const keyid = `eip8128:${CHAIN_ID}:${account.address.toLowerCase()}`;
  const params = `(${components.map((c) => `"${c}"`).join(" ")});created=${now};expires=${now + 60}${nonce};keyid="${keyid}"`;
  const signatureBase = [
    ...components.map((c) => `"${c}": ${values[c]}`),
    `"@signature-params": ${params}`,
  ].join("\n");

  // ERC-191 personal_sign over the RFC 9421 signature base.
  const signature = await account.signMessage({ message: { raw: toBytes(signatureBase) } });
  headers["signature-input"] = `eth=${params}`;
  headers["signature"] = `eth=:${Buffer.from(signature.slice(2), "hex").toString("base64")}:`;

  const res = await fetch(url, { method, headers, ...(text !== undefined ? { body: text } : {}) });
  return { status: res.status, json: await res.json().catch(() => null) };
}

// ---------------------------------------------------------------------------
// Optional: build a delegate approval (owner signs the Kernel enable digest)
// ---------------------------------------------------------------------------

async function buildDelegateApproval(
  owner: PrivateKeyAccount,
  smartWallet: Address,
  delegate: Address,
) {
  const { addressToEmptyAccount, createKernelAccount } = await import("@zerodev/sdk");
  const { KERNEL_V3_1 } = await import("@zerodev/sdk/constants");
  const { serializePermissionAccount, toPermissionValidator } =
    await import("@zerodev/permissions");
  const { toECDSASigner } = await import("@zerodev/permissions/signers");
  const { toSudoPolicy } = await import("@zerodev/permissions/policies");
  const { signerToEcdsaValidator } = await import("@zerodev/ecdsa-validator");

  const chain = CHAIN_ID === 8453 ? base : baseSepolia;
  const publicClient = createPublicClient({ chain, transport: http(process.env.CUT_RPC_URL) });
  const entryPoint = { address: entryPoint07Address, version: "0.7" as const };
  const plugin = await toPermissionValidator(publicClient, {
    entryPoint,
    kernelVersion: KERNEL_V3_1,
    signer: await toECDSASigner({ signer: addressToEmptyAccount(delegate) }),
    policies: [toSudoPolicy({})],
  });
  const sudo = await signerToEcdsaValidator(publicClient, {
    signer: owner,
    entryPoint,
    kernelVersion: KERNEL_V3_1,
  });
  const account = await createKernelAccount(publicClient, {
    entryPoint,
    kernelVersion: KERNEL_V3_1,
    address: smartWallet,
    plugins: { sudo },
  });
  // A never-installed key: the enable signature installs it with the first user operation.
  const approval = await serializePermissionAccount(
    account,
    undefined,
    undefined,
    undefined,
    plugin,
    true,
  );
  return { approval, permissionId: plugin.getIdentifier() };
}

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

function show(label: string, result: { status: number; json: unknown }) {
  console.log(`\n${label} -> ${result.status}`);
  console.log(JSON.stringify(result.json, null, 2));
}

async function main() {
  let privateKey = process.env.CUT_PRIVATE_KEY as Hex | undefined;
  if (!privateKey) {
    privateKey = generatePrivateKey();
    console.log("Generated a new owner key. Store it securely; it controls the account:");
    console.log(privateKey);
  }
  const owner = privateKeyToAccount(privateKey);
  console.log(`Owner ${owner.address} on chain ${CHAIN_ID}, API ${API_BASE}`);

  // 1. register (idempotent: the same key always returns the same account)
  const registered = await signedFetch(owner, "POST", "/api/bot/actions", {
    action: "register",
    chainId: CHAIN_ID,
    ...(process.env.CUT_REF_CODE ? { refCode: process.env.CUT_REF_CODE } : {}),
  });
  show("register", registered);
  if (registered.status !== 200 && registered.status !== 201) return;
  const smartWallet = (registered.json as { smartWallet: Address }).smartWallet;
  console.log(`Fund ${smartWallet} with USDC on chain ${CHAIN_ID} before joining paid contests.`);

  // 2. signed reads (no nonce)
  show("balance", await signedFetch(owner, "GET", `/api/bot/balance?smartWallet=${smartWallet}`));
  show("contests", await signedFetch(owner, "GET", `/api/bot/contests?smartWallet=${smartWallet}`));

  // 3. optional delegate
  const delegate = process.env.CUT_DELEGATE as Address | undefined;
  if (delegate) {
    const { approval, permissionId } = await buildDelegateApproval(owner, smartWallet, delegate);
    show(
      "delegateAdd",
      await signedFetch(owner, "POST", "/api/bot/actions", {
        action: "delegateAdd",
        chainId: CHAIN_ID,
        smartWallet,
        kind: "external",
        delegateAddress: delegate,
        approval,
        permissionId,
      }),
    );
  }

  // 4. optional entry
  const contestId = process.env.CUT_CONTEST_ID;
  const candidates = process.env.CUT_CANDIDATES?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!contestId || !candidates?.length) return;

  const lineup = await signedFetch(owner, "POST", "/api/bot/actions", {
    action: "lineupUpsert",
    chainId: CHAIN_ID,
    smartWallet,
    contestId,
    lineupId: "",
    candidates,
  });
  show("lineupUpsert", lineup);
  const lineupId = (lineup.json as { lineupId?: string } | null)?.lineupId;
  if (!lineupId) return;

  const joinBody = { action: "join", chainId: CHAIN_ID, smartWallet, contestId, lineupId };
  const prepared = await signedFetch(owner, "POST", "/api/bot/actions", joinBody);
  show("join (prepare)", prepared);
  const p = prepared.json as {
    preparedUserOp?: boolean;
    userOpHash?: Hex;
    userOp?: unknown;
  } | null;
  if (!p?.preparedUserOp || !p.userOpHash) return;

  // Sign the raw 32-byte userOpHash (EIP-191, no extra prefix) with the same key.
  const userOpSignature = await owner.signMessage({ message: { raw: p.userOpHash } });
  show(
    "join (submit)",
    await signedFetch(owner, "POST", "/api/bot/actions", {
      ...joinBody,
      userOpSignature,
      userOp: p.userOp,
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
