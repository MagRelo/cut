/**
 * Deploy a ContestController via ContestFactory and register it in the DB.
 *
 * Usage:
 *   pnpm --filter server run script:create-on-chain-contest -- <eventId> [contestName]
 */

import "dotenv/config";
import { COMMODITIES_SPORT_ID } from "@cut/sport-commodities";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEventLogs,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import ContestFactory from "../contracts/ContestFactory.json" with { type: "json" };
import sepoliaContracts from "../contracts/sepolia.json" with { type: "json" };
import { getChainConfig } from "../lib/chainConfig.js";
import { parseReferralGroupIdFromEnv } from "../lib/referralConfig.js";
import { prisma } from "../lib/prisma.js";

const BASE_SEPOLIA_CHAIN_ID = 84532;
const EXPIRY_DAYS_AFTER_SESSION = 7;
const DEFAULT_PRIMARY_DEPOSIT = 0;
const DEFAULT_REFERRAL_NETWORK_BPS = 500;

function parseArgs(): { eventId: string; name: string } {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const eventId = args[0]?.trim();
  if (!eventId) {
    throw new Error(
      "Usage: pnpm --filter server run script:create-on-chain-contest -- <eventId> [contestName]",
    );
  }
  return {
    eventId,
    name: args[1]?.trim() || "Commodity Picks",
  };
}

async function main(): Promise<void> {
  const { eventId, name } = parseArgs();

  const privateKey = process.env.ORACLE_PRIVATE_KEY?.trim();
  const oracle = process.env.ORACLE_ADDRESS?.trim();
  if (!privateKey?.startsWith("0x") || privateKey.length !== 66) {
    throw new Error("ORACLE_PRIVATE_KEY must be set to a valid 32-byte hex string");
  }
  if (!oracle) {
    throw new Error("ORACLE_ADDRESS is required");
  }

  const referralGroupId = parseReferralGroupIdFromEnv();
  if (!referralGroupId) {
    throw new Error("REFERRAL_GROUP_ID must be set (32-byte hex)");
  }

  const event = await prisma.competitionEvent.findUnique({
    where: { id: eventId },
    include: { sport: true },
  });
  if (!event) {
    throw new Error(`Event not found: ${eventId}`);
  }

  const existing = await prisma.contest.findFirst({
    where: { eventId, name },
    select: { id: true, address: true, status: true },
  });
  if (existing) {
    console.log(`[contest] already exists: ${existing.id} (${existing.address}, ${existing.status})`);
    return;
  }

  const sessionClose =
    typeof event.metadata === "object" &&
    event.metadata !== null &&
    "commodities" in event.metadata &&
    typeof (event.metadata as { commodities?: { sessionClose?: string } }).commodities
      ?.sessionClose === "string"
      ? (event.metadata as { commodities: { sessionClose: string } }).commodities.sessionClose
      : undefined;

  const expiryMs =
    (sessionClose ? new Date(sessionClose).getTime() : Date.now()) +
    EXPIRY_DAYS_AFTER_SESSION * 24 * 60 * 60 * 1000;
  const expiryTimestamp = BigInt(Math.floor(expiryMs / 1000));
  const endTime = new Date(Number(expiryTimestamp) * 1000);

  const chainConfig = getChainConfig(BASE_SEPOLIA_CHAIN_ID);
  const account = privateKeyToAccount(privateKey as Hex);
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(chainConfig.rpcUrl),
  });
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(chainConfig.rpcUrl),
  });

  const factoryAddress = sepoliaContracts.contestFactoryAddress as Hex;
  const paymentToken = sepoliaContracts.paymentTokenAddress as Hex;
  const referralGraph = sepoliaContracts.referralGraphAddress as Hex;
  const rewardCalculator = sepoliaContracts.rewardCalculatorAddress as Hex;
  const primaryDepositAmount = BigInt(DEFAULT_PRIMARY_DEPOSIT * 1_000_000);

  console.log(`[chain] Creating contest on ${chainConfig.name} via ${factoryAddress}`);
  console.log(`[chain] Oracle: ${oracle}`);
  console.log(`[chain] Expiry: ${endTime.toISOString()} (${expiryTimestamp})`);

  const hash = await walletClient.writeContract({
    address: factoryAddress,
    abi: ContestFactory.abi,
    functionName: "createContest",
    args: [
      paymentToken,
      oracle as Hex,
      primaryDepositAmount,
      BigInt(DEFAULT_REFERRAL_NETWORK_BPS),
      expiryTimestamp,
      0n,
      referralGraph,
      rewardCalculator,
      referralGroupId,
    ],
  });

  console.log(`[chain] Tx: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`createContest transaction failed: ${hash}`);
  }

  const logs = parseEventLogs({
    abi: ContestFactory.abi,
    logs: receipt.logs,
    eventName: "ContestCreated",
  });
  const contestAddress = logs[0]?.args?.contest as Hex | undefined;
  if (!contestAddress) {
    throw new Error("ContestCreated event not found in receipt");
  }

  await prisma.sport.update({
    where: { id: event.sportId },
    data: { isEnabled: true },
  });

  const contest = await prisma.contest.create({
    data: {
      name,
      description: `${event.sport.name} — ${event.externalId}`,
      eventId: event.id,
      endTime,
      address: contestAddress,
      chainId: BASE_SEPOLIA_CHAIN_ID,
      status: "OPEN",
      settings: {
        contestType: "PUBLIC",
        chainId: BASE_SEPOLIA_CHAIN_ID,
        paymentTokenAddress: paymentToken,
        paymentTokenSymbol: "xUSDC",
        oracle,
        expiryTimestamp: Number(expiryTimestamp),
        primaryDeposit: DEFAULT_PRIMARY_DEPOSIT,
        referralNetworkBps: DEFAULT_REFERRAL_NETWORK_BPS,
        referralGroupId,
        primaryDepositSecondarySubsidyBps: 0,
      },
    },
  });

  console.log(`[contest] created: ${contest.id}`);
  console.log(`[contest] address: ${contestAddress}`);
  console.log(`[contest] status: ${contest.status}`);
  console.log(`\nBrowse: /contest/${contestAddress}`);
  if (event.sportId === COMMODITIES_SPORT_ID) {
    console.log(`Event: /sports/commodities/events/${event.id}\n`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
