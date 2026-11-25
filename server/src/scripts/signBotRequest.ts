/**
 * Sign one contest list and one lineup save with the P-256 `x-cut-*` headers.
 *
 *   BOT_DELEGATE_PRIVATE_KEY=<base64 PKCS#8> SMART_WALLET=0x... \
 *     pnpm --filter server run script:sign-bot-request
 *
 * BOT_DELEGATE_PRIVATE_KEY is the privateKey from generateDelegateKey().
 * Optional: CHAIN_ID (8453), CONTEST_ID, BOT_API_ORIGIN.
 */

import "dotenv/config";
import { createCutAgent, publicKeyFromPrivate } from "@playthecut/agent";
import { getAddress, isAddress } from "viem";

const key = process.env.BOT_DELEGATE_PRIVATE_KEY?.trim();
const smartWallet = process.env.SMART_WALLET?.trim();
const contestId = process.env.CONTEST_ID?.trim() || "contest-id";
const chainId = Number(process.env.CHAIN_ID ?? "8453");
const origin = (process.env.BOT_API_ORIGIN ?? "https://playthecut.com").replace(/\/$/, "");

if (!key || !smartWallet || !isAddress(smartWallet)) {
  console.error("Set BOT_DELEGATE_PRIVATE_KEY and SMART_WALLET.");
  process.exit(1);
}
try {
  publicKeyFromPrivate(key);
} catch {
  console.error("BOT_DELEGATE_PRIVATE_KEY must be the base64 PKCS#8 key from generateDelegateKey().");
  process.exit(1);
}
if (chainId !== 8453 && chainId !== 84532) {
  console.error("CHAIN_ID must be 8453 or 84532.");
  process.exit(1);
}

const signedHeaders = [
  "content-type",
  "x-cut-public-key",
  "x-cut-signature",
  "x-cut-created",
  "x-cut-expires",
  "x-cut-nonce",
  "x-cut-chain-id",
];

async function show(request: Request): Promise<void> {
  console.log(`${request.method} ${request.url}`);
  for (const name of signedHeaders) {
    const value = request.headers.get(name);
    if (value) console.log(`${name}: ${value}`);
  }
  const body = await request.clone().text();
  if (body) console.log(body);
  console.log();
}

const agent = createCutAgent({
  privateKey: key,
  smartWallet: getAddress(smartWallet),
  chainId,
  origin,
  fetch: async (request) => {
    await show(request);
    const path = new URL(request.url).pathname;
    const body = path.includes("/lineups")
      ? { lineup: { id: "lineup-id" } }
      : /\/contests\/[^/]+$/.test(path)
        ? { eventId: "event-id" }
        : { contests: [] };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  },
});

await agent.contests();
await agent.lineupUpsert({
  contestId,
  lineupId: "",
  candidates: ["eventParticipantId"],
});
