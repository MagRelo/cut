import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load environment variables from multiple possible locations
dotenv.config({ path: "../.env" }); // Project root
dotenv.config({ path: "./.env" }); // Scripts directory
dotenv.config({ path: "../../.env" }); // Parent directory

// PaymentToken ABI - just the mint function and required view functions
const PAYMENT_TOKEN_ABI = [
  "function mint(address to, uint256 amount) external",
  "function owner() external view returns (address)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external pure returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
];

// Contract addresses for different networks
const CONTRACT_ADDRESSES = {
  base: {
    // Production Base mainnet - real USDC contract address (not our mock)
    // Note: This is the real USDC contract, we cannot mint to it
    paymentToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    rpcUrl: "https://mainnet.base.org",
  },
  sepolia: {
    // Base Sepolia testnet - our deployed mock PaymentToken
    paymentToken: process.env.PAYMENT_TOKEN_ADDRESS_SEPOLIA || "",
    rpcUrl: "https://sepolia.base.org",
  },
  development: {
    // Development/local network
    paymentToken: process.env.PAYMENT_TOKEN_ADDRESS_DEV || "",
    rpcUrl: process.env.DEV_RPC_URL || "http://localhost:8545",
  },
};

async function getLatestDeployment(network = "sepolia") {
  const broadcastDir = path.join(process.cwd(), "..", "broadcast", "Deploy_sepolia.s.sol");

  if (!fs.existsSync(broadcastDir)) {
    throw new Error(
      "Deployment broadcast directory not found. Please run the deployment script first."
    );
  }

  // Find the latest deployment
  const deployments = fs
    .readdirSync(broadcastDir)
    .filter((dir) => fs.statSync(path.join(broadcastDir, dir)).isDirectory())
    .sort()
    .reverse();

  if (deployments.length === 0) {
    throw new Error("No deployments found in broadcast directory");
  }

  const latestDeployment = deployments[0];
  const latestRunFile = path.join(broadcastDir, latestDeployment, "run-latest.json");

  if (!fs.existsSync(latestRunFile)) {
    throw new Error("Latest deployment file not found");
  }

  const deploymentData = JSON.parse(fs.readFileSync(latestRunFile, "utf8"));

  // Find PaymentToken deployment
  const paymentTokenDeployment = deploymentData.transactions.find(
    (tx) => tx.contractName === "PaymentToken"
  );

  if (!paymentTokenDeployment) {
    throw new Error("PaymentToken deployment not found in latest deployment");
  }

  return paymentTokenDeployment.contractAddress;
}

async function mintPaymentToken() {
  try {
    console.log("🪙 Payment Token Minting Script");
    console.log("================================\n");

    // Get command line arguments
    const args = process.argv.slice(2);

    if (args.length < 2) {
      console.log(
        "Usage: node mintPaymentToken.js <ORACLE_PRIVATE_KEY> <RECIPIENT_ADDRESS> [AMOUNT] [NETWORK]"
      );
      console.log("");
      console.log("Arguments:");
      console.log("  ORACLE_PRIVATE_KEY  - Private key of the contract owner");
      console.log("  RECIPIENT_ADDRESS   - Address to receive minted tokens");
      console.log("  AMOUNT             - Amount to mint (default: 1000000000 = 1000 USDC)");
      console.log("  NETWORK            - Network: sepolia, base, development (default: sepolia)");
      console.log("");
      console.log("Example:");
      console.log("  node mintPaymentToken.js 0x123... 0xabc... 1000000000 sepolia");
      process.exit(1);
    }

    const PRIVATE_KEY = args[0];
    const RECIPIENT_ADDRESS = args[1];
    const AMOUNT = args[2] || "1000000000"; // 1000 USDC (6 decimals)
    const NETWORK = args[3] || "sepolia"; // default to sepolia
    const USE_LATEST_DEPLOYMENT = process.env.USE_LATEST_DEPLOYMENT === "true";

    // Validation
    if (!PRIVATE_KEY || PRIVATE_KEY.length < 10) {
      throw new Error("Invalid ORACLE_PRIVATE_KEY provided");
    }

    if (!RECIPIENT_ADDRESS) {
      throw new Error("RECIPIENT_ADDRESS is required");
    }

    // Validate recipient address
    if (!ethers.isAddress(RECIPIENT_ADDRESS)) {
      throw new Error("Invalid RECIPIENT_ADDRESS");
    }

    // Get network configuration
    const networkConfig = CONTRACT_ADDRESSES[NETWORK];
    if (!networkConfig) {
      throw new Error(
        `Unsupported network: ${NETWORK}. Supported networks: base, sepolia, development`
      );
    }

    let PAYMENT_TOKEN_ADDRESS = networkConfig.paymentToken;
    const RPC_URL = networkConfig.rpcUrl;

    // For sepolia, try to get the latest deployment if enabled
    if (NETWORK === "sepolia" && USE_LATEST_DEPLOYMENT) {
      try {
        PAYMENT_TOKEN_ADDRESS = await getLatestDeployment();
        console.log("📋 Using PaymentToken address from latest deployment:", PAYMENT_TOKEN_ADDRESS);
      } catch (error) {
        console.error("Failed to get latest deployment:", error.message);
        console.log("Falling back to configured PaymentToken address");
        if (!PAYMENT_TOKEN_ADDRESS) {
          throw new Error("No PaymentToken address available");
        }
      }
    }

    if (!PAYMENT_TOKEN_ADDRESS) {
      throw new Error(`PAYMENT_TOKEN_ADDRESS not configured for network: ${NETWORK}`);
    }

    // Validate contract address
    if (!ethers.isAddress(PAYMENT_TOKEN_ADDRESS)) {
      throw new Error("Invalid PAYMENT_TOKEN_ADDRESS");
    }

    // Warning for production network
    if (NETWORK === "base") {
      console.log("⚠️  WARNING: You are trying to mint tokens on Base mainnet!");
      console.log("   The configured address is the real USDC contract which cannot be minted.");
      console.log(
        "   This script will fail unless you have deployed your own PaymentToken contract."
      );
      console.log("   Use 'sepolia' network for testing purposes.\n");
    }

    // Connect to the network
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log("🔗 Network:", NETWORK);
    console.log("🌐 RPC URL:", RPC_URL);
    console.log("👛 Oracle wallet address:", wallet.address);
    console.log("🎯 PaymentToken address:", PAYMENT_TOKEN_ADDRESS);
    console.log("📤 Recipient address:", RECIPIENT_ADDRESS);
    console.log("💰 Amount to mint:", AMOUNT, "tokens (raw amount)");

    // Get network info
    const network = await provider.getNetwork();
    console.log("🔗 Connected to network:", network.name, "chainId:", network.chainId.toString());

    // Create contract instance
    const paymentToken = new ethers.Contract(PAYMENT_TOKEN_ADDRESS, PAYMENT_TOKEN_ABI, wallet);

    // Get token info
    const [name, symbol, decimals] = await Promise.all([
      paymentToken.name(),
      paymentToken.symbol(),
      paymentToken.decimals(),
    ]);

    console.log("🏷️  Token info:", name, `(${symbol})`, `- ${decimals} decimals`);
    console.log("💰 Amount to mint:", ethers.formatUnits(AMOUNT, decimals), symbol);

    // Check if the wallet is the owner
    const owner = await paymentToken.owner();
    console.log("👑 Contract owner:", owner);

    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new Error(
        `Oracle wallet (${wallet.address}) is not the owner of the PaymentToken contract. Owner is: ${owner}`
      );
    }

    // Get current balance of recipient
    const currentBalance = await paymentToken.balanceOf(RECIPIENT_ADDRESS);
    console.log(
      "💳 Current balance of recipient:",
      ethers.formatUnits(currentBalance, decimals),
      symbol
    );

    // Get wallet balance for gas fees
    const walletBalance = await provider.getBalance(wallet.address);
    console.log("⛽ Oracle wallet ETH balance:", ethers.formatEther(walletBalance), "ETH");

    if (walletBalance < ethers.parseEther("0.001")) {
      console.log("⚠️  Warning: Low ETH balance for gas fees");
    }

    // Mint tokens
    console.log("\n🪙 Minting tokens...");
    const tx = await paymentToken.mint(RECIPIENT_ADDRESS, AMOUNT);
    console.log("📝 Transaction hash:", tx.hash);

    // Wait for transaction to be mined
    console.log("⏳ Waiting for transaction confirmation...");
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("⛽ Gas used:", receipt.gasUsed.toString());

    // Get new balance
    const newBalance = await paymentToken.balanceOf(RECIPIENT_ADDRESS);
    console.log("💳 New balance of recipient:", ethers.formatUnits(newBalance, decimals), symbol);

    const mintedAmount = newBalance - currentBalance;
    console.log(
      "\n🎉 Successfully minted",
      ethers.formatUnits(mintedAmount, decimals),
      symbol,
      "to",
      RECIPIENT_ADDRESS
    );
    console.log(
      "🔗 Transaction:",
      `https://${NETWORK === "base" ? "" : "sepolia."}basescan.org/tx/${tx.hash}`
    );
  } catch (error) {
    console.error("\n❌ Error minting tokens:", error.message);

    // Provide helpful debugging info
    if (error.message.includes("owner")) {
      console.log("\n💡 Debugging tips:");
      console.log("   - Make sure ORACLE_PRIVATE_KEY corresponds to the contract owner");
      console.log("   - For testnet: deploy your own PaymentToken contract first");
      console.log("   - For mainnet: you cannot mint real USDC tokens");
    }

    if (error.message.includes("network") || error.message.includes("RPC")) {
      console.log("\n💡 Network debugging tips:");
      console.log("   - Check your RPC URL is correct");
      console.log("   - Ensure you have network connectivity");
      console.log("   - Try a different RPC endpoint");
    }

    process.exit(1);
  }
}

// Display usage information
function displayUsage() {
  console.log("🪙 Payment Token Minting Script Usage");
  console.log("=====================================\n");
  console.log("Environment Variables:");
  console.log("  ORACLE_PRIVATE_KEY       - Private key of the contract owner (required)");
  console.log("  RECIPIENT_ADDRESS        - Address to receive minted tokens (required)");
  console.log(
    "  AMOUNT                   - Amount to mint in raw units (default: 1000000000 = 1000 USDC)"
  );
  console.log(
    "  NETWORK                  - Network to use: 'base', 'sepolia', 'development' (default: sepolia)"
  );
  console.log("  USE_LATEST_DEPLOYMENT    - Use latest deployment for sepolia (default: false)");
  console.log("\nSupported Networks:");
  console.log("  sepolia      - Base Sepolia testnet (recommended for testing)");
  console.log("  development  - Local development network");
  console.log("  base         - Base mainnet (⚠️  cannot mint real USDC)");
  console.log("\nExamples:");
  console.log("  # Mint 1000 USDC to address on sepolia");
  console.log("  ORACLE_PRIVATE_KEY=0x... RECIPIENT_ADDRESS=0x... npm run mint");
  console.log("");
  console.log("  # Mint 500 USDC using latest deployment");
  console.log(
    "  ORACLE_PRIVATE_KEY=0x... RECIPIENT_ADDRESS=0x... AMOUNT=500000000 USE_LATEST_DEPLOYMENT=true npm run mint"
  );
  console.log("");
}

// Check if help is requested
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  displayUsage();
  process.exit(0);
}

// Run the script
mintPaymentToken().catch(console.error);
