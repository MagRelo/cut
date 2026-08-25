/**
 * CSV of USER accounts and their Base Sepolia MockUSDC (xUSDC) balances.
 *
 * Uses PROD_DATABASE_URL when set, else DATABASE_URL.
 *
 *   cd server && pnpm exec tsx src/scripts/exportSepoliaUserBalances.ts
 */

import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { erc20Abi, formatUnits, isAddress } from "viem";
import { prisma } from "../lib/prisma.js";
import { getPaymentTokenAddress } from "../lib/contractAddresses.js";
import { getPublicClient } from "../services/shared/contractClient.js";
import { pickWalletForChain } from "../utils/pickWalletForChain.js";

const SEPOLIA_CHAIN_ID = 84532;
const TOKEN_DECIMALS = 6;
const MULTICALL_BATCH = 100;

if (process.env.PROD_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.PROD_DATABASE_URL;
}

function tsvField(value: string): string {
  return value.replace(/\t/g, " ").replace(/\r?\n/g, " ");
}

function dbLabel(url: string | undefined): string {
  if (!url) return "(unset)";
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return "(unparseable)";
  }
}

function pickWalletAddress(
  wallets: Array<{ publicKey: string; chainId: number; isPrimary: boolean }>,
): string | null {
  const sepolia = pickWalletForChain(wallets, SEPOLIA_CHAIN_ID);
  if (sepolia?.publicKey) return sepolia.publicKey;
  const any = [...wallets].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))[0];
  return any?.publicKey ?? null;
}

async function main() {
  const token = getPaymentTokenAddress(SEPOLIA_CHAIN_ID);
  if (!token) {
    throw new Error("Sepolia paymentTokenAddress missing from server/src/contracts/sepolia.json");
  }

  console.log(`DB ${dbLabel(process.env.DATABASE_URL)}`);
  console.log(`Token ${token} on chain ${SEPOLIA_CHAIN_ID}`);

  const users = await prisma.user.findMany({
    where: { userType: "USER" },
    select: {
      name: true,
      email: true,
      wallets: { select: { publicKey: true, chainId: true, isPrimary: true } },
    },
    orderBy: { name: "asc" },
  });

  const rows = users.map((user) => {
    const wallet = pickWalletAddress(user.wallets);
    return { username: user.name, email: user.email ?? "", wallet };
  });

  const publicClient = getPublicClient(SEPOLIA_CHAIN_ID);
  const balances = new Map<string, bigint>();
  const indexed = rows
    .map((row, i) => ({ i, wallet: row.wallet }))
    .filter(
      (row): row is { i: number; wallet: string } =>
        typeof row.wallet === "string" && isAddress(row.wallet),
    );

  for (let start = 0; start < indexed.length; start += MULTICALL_BATCH) {
    const batch = indexed.slice(start, start + MULTICALL_BATCH);
    const results = await publicClient.multicall({
      contracts: batch.map((row) => ({
        address: token,
        abi: erc20Abi,
        functionName: "balanceOf" as const,
        args: [row.wallet as `0x${string}`],
      })),
      allowFailure: true,
    });
    results.forEach((res, idx) => {
      const wallet = batch[idx]?.wallet;
      if (!wallet) return;
      balances.set(wallet.toLowerCase(), res.status === "success" ? (res.result as bigint) : 0n);
    });
  }

  const lines = [
    ["username", "email", "wallet", "balance"].join("\t"),
    ...rows.map((row) => {
      const wei =
        row.wallet && isAddress(row.wallet)
          ? (balances.get(row.wallet.toLowerCase()) ?? 0n)
          : null;
      const balance = wei == null ? "" : formatUnits(wei, TOKEN_DECIMALS);
      return [
        tsvField(row.username),
        tsvField(row.email),
        tsvField(row.wallet ?? ""),
        tsvField(balance),
      ].join("\t");
    }),
  ];

  const outDir = join(dirname(fileURLToPath(import.meta.url)), "../../tmp");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "sepolia-user-balances.csv");
  writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");

  const withWallet = rows.filter((r) => r.wallet).length;
  const withBalance = [...balances.values()].filter((v) => v > 0n).length;
  console.log(`Wrote ${rows.length} USER rows (${withWallet} wallets, ${withBalance} with xUSDC > 0)`);
  console.log(outPath);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
