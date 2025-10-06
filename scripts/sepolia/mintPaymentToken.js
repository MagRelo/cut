import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), "contracts", ".env") });

// PaymentToken ABI - just the mint function
const PAYMENT_TOKEN_ABI = [
  "function mint(address to, uint256 amount) external",
  "function owner() external view returns (address)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external pure returns (uint8)",
];

async function getLatestDeployment() {
  const broadcastDir = path.join(process.cwd(), "contracts", "broadcast", "Deploy_sepolia.s.sol");

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
    (tx) => tx.contractName === "MockUSDC"
  );

  if (!paymentTokenDeployment) {
    throw new Error("MockUSDC deployment not found in latest deployment");
  }

  return paymentTokenDeployment.contractAddress;
}

async function mintPaymentToken() {
  // Get environment variables
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const RPC_URL =
    process.env.SEPOLIA_RPC_URL || process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
  const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS;
  const AMOUNT = process.env.AMOUNT || "10000000000"; // 10000 USDC (6 decimals)
  const USE_LATEST_DEPLOYMENT = process.env.USE_LATEST_DEPLOYMENT === "true";

  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  if (!RECIPIENT_ADDRESS) {
    throw new Error("RECIPIENT_ADDRESS environment variable is required");
  }

  // Validate recipient address
  if (!ethers.isAddress(RECIPIENT_ADDRESS)) {
    throw new Error("Invalid RECIPIENT_ADDRESS");
  }

  let PAYMENT_TOKEN_ADDRESS;

  if (USE_LATEST_DEPLOYMENT) {
    try {
      PAYMENT_TOKEN_ADDRESS = await getLatestDeployment();
      console.log("📋 Using PaymentToken address from latest deployment:", PAYMENT_TOKEN_ADDRESS);
    } catch (error) {
      console.error("Failed to get latest deployment:", error.message);
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

  // Validate contract address
  if (!ethers.isAddress(PAYMENT_TOKEN_ADDRESS)) {
    throw new Error("Invalid PAYMENT_TOKEN_ADDRESS");
  }

  // Connect to the network
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("🔗 Connected to network:", await provider.getNetwork());
  console.log("👛 Wallet address:", wallet.address);
  console.log("🎯 PaymentToken address:", PAYMENT_TOKEN_ADDRESS);
  console.log("📤 Recipient address:", RECIPIENT_ADDRESS);
  console.log("💰 Amount to mint:", AMOUNT, "tokens (6 decimals)");

  // Create contract instance
  const paymentToken = new ethers.Contract(PAYMENT_TOKEN_ADDRESS, PAYMENT_TOKEN_ABI, wallet);

  try {
    // Check if the wallet is the owner
    const owner = await paymentToken.owner();
    console.log("👑 Contract owner:", owner);

    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new Error("Wallet is not the owner of the PaymentToken contract");
    }

    // Get current balance of recipient
    const currentBalance = await paymentToken.balanceOf(RECIPIENT_ADDRESS);
    const decimals = await paymentToken.decimals();
    console.log("💳 Current balance of recipient:", ethers.formatUnits(currentBalance, decimals));

    // Mint tokens
    console.log("\n🪙 Minting tokens...");
    const tx = await paymentToken.mint(RECIPIENT_ADDRESS, AMOUNT);
    console.log("📝 Transaction hash:", tx.hash);

    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("⛽ Gas used:", receipt.gasUsed.toString());

    // Get new balance
    const newBalance = await paymentToken.balanceOf(RECIPIENT_ADDRESS);
    console.log("💳 New balance of recipient:", ethers.formatUnits(newBalance, decimals));

    console.log(
      "\n🎉 Successfully minted",
      ethers.formatUnits(AMOUNT, decimals),
      "tokens to",
      RECIPIENT_ADDRESS
    );
  } catch (error) {
    console.error("❌ Error minting tokens:", error.message);
    process.exit(1);
  }
}

// Run the script
mintPaymentToken().catch(console.error);
