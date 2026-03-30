/**
 * Oracle-only: call ContestController.pushPrimaryPayouts or pushSecondaryPayouts on Base Sepolia.
 *
 * Usage (from repo root):
 *   node scripts/sepolia/pushPayouts.js primary <controllerAddress>
 *   node scripts/sepolia/pushPayouts.js secondary <controllerAddress>
 *   pnpm run push-primary-payouts -- 0x...
 *
 * Env (contracts/.env): PRIVATE_KEY
 * Optional: CONTEST_CONTROLLER_ADDRESS if you omit the CLI address
 * Primary: ENTRY_IDS — comma-separated entry ids, e.g. ENTRY_IDS=1,2,3
 * Secondary: ENTRY_ID — winning entry id; PARTICIPANTS — comma-separated addresses
 *
 * Optional: BASE_SEPOLIA_RPC_URL
 */
import {
  createPublicClient,
  createWalletClient,
  getContract,
  http,
  isAddress,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), "contracts", ".env") });

const CONTEST_ABI = parseAbi([
  "function oracle() external view returns (address)",
  "function pushPrimaryPayouts(uint256[] entryIds) external",
  "function pushSecondaryPayouts(address[] participantAddresses, uint256 entryId) external",
]);

function normalizePrivateKey(key) {
  const trimmed = key.trim();
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

function parseEntryIds(raw) {
  if (!raw || !String(raw).trim()) {
    throw new Error("ENTRY_IDS is required for primary (comma-separated uint256s, e.g. 1,2,3)");
  }
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const n = BigInt(s);
      if (n < 0n) throw new Error(`Invalid entry id: ${s}`);
      return n;
    });
}

function parseParticipants(raw) {
  if (!raw || !String(raw).trim()) {
    throw new Error(
      "PARTICIPANTS is required for secondary (comma-separated checksummed or lowercase addresses)"
    );
  }
  const addrs = String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const a of addrs) {
    if (!isAddress(a)) throw new Error(`Invalid participant address: ${a}`);
  }
  return addrs;
}

async function main() {
  const mode = process.argv[2];
  const addressArg = process.argv[3];

  if (mode !== "primary" && mode !== "secondary") {
    console.error(
      "Usage: node scripts/sepolia/pushPayouts.js <primary|secondary> <controllerAddress>\n" +
        "  (or set CONTEST_CONTROLLER_ADDRESS in contracts/.env if you omit the address)"
    );
    process.exit(1);
  }

  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
  const contestAddress = addressArg?.trim() || process.env.CONTEST_CONTROLLER_ADDRESS;

  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY is required in contracts/.env");
  }
  if (!contestAddress || !isAddress(contestAddress)) {
    throw new Error(
      "Contest controller address required: pass as second argument or set CONTEST_CONTROLLER_ADDRESS"
    );
  }

  const account = privateKeyToAccount(normalizePrivateKey(PRIVATE_KEY));

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const contest = getContract({
    address: contestAddress,
    abi: CONTEST_ABI,
    client: { public: publicClient, wallet: walletClient },
  });

  const oracleOnChain = await contest.read.oracle();
  if (oracleOnChain.toLowerCase() !== account.address.toLowerCase()) {
    throw new Error(
      `Wallet ${account.address} is not the contest oracle (${oracleOnChain}). Only the oracle can push payouts.`
    );
  }

  console.log("Chain:", baseSepolia.name, "id", baseSepolia.id);
  console.log("Contest:", contestAddress);
  console.log("Oracle wallet:", account.address);

  if (mode === "primary") {
    const entryIds = parseEntryIds(process.env.ENTRY_IDS);
    console.log("pushPrimaryPayouts entryIds:", entryIds.map((x) => x.toString()).join(", "));
    const hash = await contest.write.pushPrimaryPayouts([entryIds]);
    console.log("Tx:", hash);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Confirmed block:", receipt.blockNumber.toString(), "gas:", receipt.gasUsed.toString());
    return;
  }

  const entryId = process.env.ENTRY_ID;
  if (entryId === undefined || entryId === "") {
    throw new Error("ENTRY_ID is required for secondary (winning entry id as uint256 string)");
  }
  const entryIdBig = BigInt(String(entryId).trim());
  const participants = parseParticipants(process.env.PARTICIPANTS);

  console.log("pushSecondaryPayouts entryId:", entryIdBig.toString());
  console.log("participants:", participants.join(", "));
  const hash = await contest.write.pushSecondaryPayouts([participants, entryIdBig]);
  console.log("Tx:", hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("Confirmed block:", receipt.blockNumber.toString(), "gas:", receipt.gasUsed.toString());
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
