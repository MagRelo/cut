/**
 * Oracle-only: call ContestController.claimOracleFee() on Base Sepolia.
 * Pulls accumulated oracle fees (from deposits) to the oracle wallet — not the same as contest close.
 *
 * Usage (from repo root):
 *   node scripts/sepolia/claimOracleFee.js <controllerAddress>
 *   pnpm run claim-oracle-fee -- 0x...
 *
 * Env (contracts/.env): PRIVATE_KEY
 * Optional: CONTEST_CONTROLLER_ADDRESS if you omit the CLI address
 * Optional: BASE_SEPOLIA_RPC_URL
 */
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
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
  "function paymentToken() external view returns (address)",
  "function accumulatedOracleFee() external view returns (uint256)",
  "function claimOracleFee() external",
]);

const ERC20_DECIMALS_ABI = parseAbi(["function decimals() external view returns (uint8)"]);

function normalizePrivateKey(key) {
  const trimmed = key.trim();
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

async function main() {
  const addressArg = process.argv[2];

  if (process.argv.includes("-h") || process.argv.includes("--help")) {
    console.log("Usage: node scripts/sepolia/claimOracleFee.js <controllerAddress>");
    process.exit(0);
  }

  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
  const contestAddress = addressArg?.trim() || process.env.CONTEST_CONTROLLER_ADDRESS;

  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY is required in contracts/.env");
  }
  if (!contestAddress || !isAddress(contestAddress)) {
    throw new Error(
      "Contest controller address required: pass as first argument or set CONTEST_CONTROLLER_ADDRESS"
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
      `Wallet ${account.address} is not the contest oracle (${oracleOnChain}). Only the oracle can claim fees.`
    );
  }

  const accumulated = await contest.read.accumulatedOracleFee();
  if (accumulated === 0n) {
    console.log("No accumulated oracle fee to claim (accumulatedOracleFee = 0).");
    process.exit(0);
  }

  let decimals = 6;
  try {
    const token = await contest.read.paymentToken();
    const tokenContract = getContract({
      address: token,
      abi: ERC20_DECIMALS_ABI,
      client: { public: publicClient },
    });
    decimals = await tokenContract.read.decimals();
  } catch {
    // keep default
  }

  console.log("Chain:", baseSepolia.name, "id", baseSepolia.id);
  console.log("Contest:", contestAddress);
  console.log("Oracle wallet:", account.address);
  console.log("Accumulated fee:", accumulated.toString(), `(${formatUnits(accumulated, decimals)} tokens)`);

  const hash = await contest.write.claimOracleFee();
  console.log("Tx:", hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("Confirmed block:", receipt.blockNumber.toString(), "gas:", receipt.gasUsed.toString());
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
