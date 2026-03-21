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
import fs from "fs";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), "contracts", ".env") });

const PAYMENT_TOKEN_ABI = parseAbi([
  "function mint(address to, uint256 amount) external",
  "function owner() external view returns (address)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external pure returns (uint8)",
]);

function getPaymentTokenAddressFromSepoliaJson() {
  const configPath = path.join(process.cwd(), "server", "src", "contracts", "sepolia.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing ${configPath}. Run deploy or copy contract addresses.`);
  }
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  if (!config.paymentTokenAddress) {
    throw new Error("sepolia.json is missing paymentTokenAddress");
  }
  return config.paymentTokenAddress;
}

function normalizePrivateKey(key) {
  const trimmed = key.trim();
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

async function mintPaymentToken() {
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
  const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS;
  const AMOUNT = process.env.AMOUNT || "10000000000"; // 10000 USDC (6 decimals)
  const USE_LATEST_DEPLOYMENT = process.env.USE_LATEST_DEPLOYMENT === "true";

  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  if (!RECIPIENT_ADDRESS) {
    throw new Error("RECIPIENT_ADDRESS environment variable is required");
  }

  if (!isAddress(RECIPIENT_ADDRESS)) {
    throw new Error("Invalid RECIPIENT_ADDRESS");
  }

  let PAYMENT_TOKEN_ADDRESS;

  if (USE_LATEST_DEPLOYMENT) {
    try {
      PAYMENT_TOKEN_ADDRESS = getPaymentTokenAddressFromSepoliaJson();
      console.log("📋 Using payment token from server/src/contracts/sepolia.json:", PAYMENT_TOKEN_ADDRESS);
    } catch (error) {
      console.error("Failed to read sepolia.json:", error.message);
      console.log("Falling back to PAYMENT_TOKEN_ADDRESS environment variable");
      PAYMENT_TOKEN_ADDRESS = process.env.PAYMENT_TOKEN_ADDRESS;
    }
  } else {
    PAYMENT_TOKEN_ADDRESS = process.env.PAYMENT_TOKEN_ADDRESS;
  }

  if (!PAYMENT_TOKEN_ADDRESS) {
    throw new Error(
      "PAYMENT_TOKEN_ADDRESS environment variable is required when not using latest deployment"
    );
  }

  if (!isAddress(PAYMENT_TOKEN_ADDRESS)) {
    throw new Error("Invalid PAYMENT_TOKEN_ADDRESS");
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

  const chainId = await publicClient.getChainId();
  console.log("🔗 Connected, chain id:", chainId);
  console.log("👛 Wallet address:", account.address);
  console.log("🎯 PaymentToken address:", PAYMENT_TOKEN_ADDRESS);
  console.log("📤 Recipient address:", RECIPIENT_ADDRESS);
  console.log("💰 Amount to mint:", AMOUNT, "tokens (6 decimals)");

  const paymentToken = getContract({
    address: PAYMENT_TOKEN_ADDRESS,
    abi: PAYMENT_TOKEN_ABI,
    client: { public: publicClient, wallet: walletClient },
  });

  try {
    const owner = await paymentToken.read.owner();
    console.log("👑 Contract owner:", owner);

    if (owner.toLowerCase() !== account.address.toLowerCase()) {
      throw new Error("Wallet is not the owner of the PaymentToken contract");
    }

    const currentBalance = await paymentToken.read.balanceOf([RECIPIENT_ADDRESS]);
    const decimals = await paymentToken.read.decimals();
    console.log("💳 Current balance of recipient:", formatUnits(currentBalance, decimals));

    console.log("\n🪙 Minting tokens...");
    const hash = await paymentToken.write.mint([RECIPIENT_ADDRESS, BigInt(AMOUNT)]);
    console.log("📝 Transaction hash:", hash);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("⛽ Gas used:", receipt.gasUsed.toString());

    const newBalance = await paymentToken.read.balanceOf([RECIPIENT_ADDRESS]);
    console.log("💳 New balance of recipient:", formatUnits(newBalance, decimals));

    console.log(
      "\n🎉 Successfully minted",
      formatUnits(BigInt(AMOUNT), decimals),
      "tokens to",
      RECIPIENT_ADDRESS
    );
  } catch (error) {
    console.error("❌ Error minting tokens:", error.message);
    process.exit(1);
  }
}

mintPaymentToken().catch(console.error);
