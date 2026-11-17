/**
 * Sign one contest list and one lineup save with ERC-8128.
 *
 *   BOT_DELEGATE_PRIVATE_KEY=0x... SMART_WALLET=0x... \
 *     pnpm --filter server run script:sign-bot-request
 *
 * Optional: CHAIN_ID (8453), CONTEST_ID, BOT_API_ORIGIN.
 */

import "dotenv/config";
import { createCutAgent } from "@playthecut/agent";
import { getAddress, isAddress, type Hex } from "viem";

const key = process.env.BOT_DELEGATE_PRIVATE_KEY?.trim();
const smartWallet = process.env.SMART_WALLET?.trim();
const contestId = process.env.CONTEST_ID?.trim() || "contest-id";
const chainId = Number(process.env.CHAIN_ID ?? "8453");
const origin = (process.env.BOT_API_ORIGIN ?? "https://playthecut.com").replace(/\/$/, "");

if (!key?.startsWith("0x") || !smartWallet || !isAddress(smartWallet)) {
  console.error("Set BOT_DELEGATE_PRIVATE_KEY and SMART_WALLET.");
  process.exit(1);
}
if (chainId !== 8453 && chainId !== 84532) {
  console.error("CHAIN_ID must be 8453 or 84532.");
  process.exit(1);
}

async function show(request: Request): Promise<void> {
  console.log(`${request.method} ${request.url}`);
  for (const name of ["content-type", "content-digest", "signature-input", "signature"]) {
    const value = request.headers.get(name);
    if (value) console.log(`${name}: ${value}`);
  }
  const body = await request.clone().text();
  if (body) console.log(body);
  console.log();
}

const agent = createCutAgent({
  privateKey: key as Hex,
  smartWallet: getAddress(smartWallet),
  chainId,
  origin,
  fetch: async (request) => {
    await show(request);
    const path = new URL(request.url).pathname;
    const body = path.endsWith("/actions") ? { ok: true, lineupId: "lineup-id" } : { contests: [] };
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
