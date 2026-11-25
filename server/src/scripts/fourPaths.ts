/**
 * Exercise the four account doors on Base Sepolia: human, agent, agent-then-human,
 * and human-then-agent. Mints test USDC. Human login, sends, and the delegate
 * grant happen in a headed browser on the website. Agent register and agent
 * sends stay on the API.
 *
 *   pnpm --filter server run script:four-paths
 *
 * The API must already be running at BOT_API_ORIGIN (default http://localhost:3000).
 * The client must be Base Sepolia (`VITE_TARGET_CHAIN=testnet`). Port 5173 is the
 * mainnet `pnpm dev` client, so this script uses the Sepolia client on 5174.
 * It stops unless that page says Base Sepolia.
 * Path 3 emails a Play The Cut claim code, then a Privy OTP, to PATH3_EMAIL and waits for both on stdin.
 */

import "dotenv/config";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createCutAgent, CutAgentError, generateDelegateKey } from "@playthecut/agent";
import { getAddress, type Address } from "viem";
import { prisma } from "../lib/prisma.js";
import { getPrivyClient } from "../lib/privyClient.js";
import { mintUSDCToUser } from "../services/mintUserTokens.js";
import { CutBrowser } from "./fourPathsBrowser.js";

const CHAIN_ID = 84532;
const ORIGIN = (process.env.BOT_API_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");
const APP_ORIGIN = "http://127.0.0.1:5174";
const PATH3_EMAIL = process.env.PATH3_EMAIL?.trim() ?? "";
const SEND_AMOUNT = "1";

type TestLogin = { email: string; otp: string };

function fail(message: string): never {
  throw new Error(message);
}

async function testLogins(): Promise<[TestLogin, TestLogin]> {
  const appId = process.env.PRIVY_APP_ID?.trim();
  if (!appId) fail("PRIVY_APP_ID is not set");
  const listed = await getPrivyClient().apps().getTestCredentials(appId);
  const accounts = listed.data.filter((account) => account.email && account.otp_code);
  const first = accounts[0];
  const second = accounts[1];
  if (!first || !second) fail("Privy needs two test accounts");
  return [
    { email: first.email, otp: first.otp_code },
    { email: second.email, otp: second.otp_code },
  ];
}

async function walletRow(smartWallet: Address) {
  const row = await prisma.userWallet.findFirst({
    where: { chainId: CHAIN_ID, publicKey: smartWallet.toLowerCase(), isPrimary: true },
    include: { user: { include: { botDelegates: true } } },
  });
  if (!row) fail(`No primary wallet for ${smartWallet}`);
  return row;
}

async function mint(address: Address): Promise<void> {
  const result = await mintUSDCToUser(address, 1000);
  if (!result.success || !result.transaction) fail(result.error ?? "Mint failed");
  console.log(`mint ${address} ${result.transaction}`);
}

async function agentSend(privateKey: string, smartWallet: Address, to: Address): Promise<void> {
  const agent = createCutAgent({
    privateKey,
    smartWallet,
    chainId: CHAIN_ID,
    origin: ORIGIN,
  });
  const result = await agent.send({ to, amount: SEND_AMOUNT });
  console.log(`send ${smartWallet} -> ${to} ${result.txHash}`);
}

async function readCode(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input, output });
  try {
    const code = (await rl.question(prompt)).trim();
    if (!/^\d{6}$/.test(code)) fail("Code must be 6 digits");
    return code;
  } finally {
    rl.close();
  }
}

async function claimEmail(email: string, code: string): Promise<void> {
  const response = await fetch(`${ORIGIN}/api/auth/claim-email`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  if (!response.ok) {
    fail(`claim-email failed: ${response.status} ${await response.text()}`);
  }
}

async function main(): Promise<void> {
  if (!PATH3_EMAIL) fail("PATH3_EMAIL is not set");
  const [first, second] = await testLogins();
  const browser = await CutBrowser.open(APP_ORIGIN);
  try {
    await browser.signIn(first.email, first.otp);
    await browser.assertSepolia();
    const path1Wallet = await browser.kernelAddress();
    await mint(path1Wallet);
    console.log(`path 1 kernel ${path1Wallet}`);

    const path2Key = generateDelegateKey();
    const path2Agent = createCutAgent({
      privateKey: path2Key.privateKey,
      chainId: CHAIN_ID,
      origin: ORIGIN,
    });
    const path2 = await path2Agent.register({});
    if (!path2.created) fail("Path 2 register did not create an account");
    const path2Wallet = getAddress(path2.smartWallet);
    await mint(path2Wallet);
    console.log(`path 2 kernel ${path2Wallet}`);

    await browser.send(path2Wallet, SEND_AMOUNT);
    console.log(`send ${path1Wallet} -> ${path2Wallet}`);
    const path1Row = await walletRow(path1Wallet);
    if (path1Row.ownerAddress) fail("Path 1 ownerAddress is set");
    if (path1Row.user.botDelegates.length > 0) fail("Path 1 has a delegate");

    await agentSend(path2Key.privateKey, path2Wallet, path1Wallet);
    const path2Row = await walletRow(path2Wallet);
    if (path2Row.user.lastLoginAt) fail("Path 2 already has a login");

    const path3Key = generateDelegateKey();
    const path3Agent = createCutAgent({
      privateKey: path3Key.privateKey,
      chainId: CHAIN_ID,
      origin: ORIGIN,
    });
    let path3;
    try {
      path3 = await path3Agent.register({ email: PATH3_EMAIL });
    } catch (error) {
      if (
        error instanceof CutAgentError &&
        error.body &&
        typeof error.body === "object" &&
        "code" in error.body &&
        error.body.code === "EMAIL_ALREADY_BOUND"
      ) {
        fail("EMAIL_ALREADY_BOUND");
      }
      throw error;
    }
    if (!path3.created) fail("Path 3 register did not create an account");
    if (path3.email != null || !path3.emailPending) {
      fail("Path 3 email was linked before the claim code");
    }
    const path3Wallet = getAddress(path3.smartWallet);
    await mint(path3Wallet);
    console.log(`path 3 kernel ${path3Wallet}`);
    await agentSend(path3Key.privateKey, path3Wallet, path1Wallet);

    await browser.signOut();
    const claimCode = await readCode(`Enter the Play The Cut code sent to ${PATH3_EMAIL}: `);
    await claimEmail(PATH3_EMAIL, claimCode);
    await browser.signIn(PATH3_EMAIL, () =>
      readCode(`Enter the Privy code sent to ${PATH3_EMAIL}: `),
    );
    const path3Session = await browser.kernelAddress();
    if (path3Session !== path3Wallet) {
      fail(`Path 3 session wallet ${path3Session} is not the registered Kernel ${path3Wallet}`);
    }
    const path3Row = await walletRow(path3Wallet);
    if (!path3Row.user.lastLoginAt) fail("Path 3 login was not recorded");
    if (path3Row.ownerAddress) fail("Path 3 ownerAddress is set");
    await browser.send(path1Wallet, SEND_AMOUNT);
    console.log(`send ${path3Wallet} -> ${path1Wallet}`);

    await browser.signOut();
    await browser.signIn(second.email, second.otp);
    await browser.assertSepolia();
    const path4Wallet = await browser.kernelAddress();
    await mint(path4Wallet);
    console.log(`path 4 kernel ${path4Wallet}`);
    const path4Key = generateDelegateKey();
    await browser.grant(path4Key.publicKey);
    const path4Row = await walletRow(path4Wallet);
    const delegate = path4Row.user.botDelegates.find(
      (row) => row.delegateAddress === path4Key.publicKey && row.status === "active",
    );
    if (!delegate) fail("Path 4 has no active delegate");
    await agentSend(path4Key.privateKey, path4Wallet, path1Wallet);

    console.log("Four paths passed");
  } finally {
    await browser.close();
  }
}

function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const parts = [error.message];
  let current: unknown = error.cause;
  for (let depth = 0; current && depth < 4; depth += 1) {
    if (current instanceof Error) {
      const code = "code" in current ? String(current.code) : "";
      parts.push([current.name, code, current.message].filter(Boolean).join(" "));
      current = current.cause;
      continue;
    }
    parts.push(String(current));
    break;
  }
  return parts.join(" | ");
}

main()
  .catch((error: unknown) => {
    console.error(describe(error));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
