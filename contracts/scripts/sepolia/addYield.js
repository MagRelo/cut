import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: "../.env" });

// MockCToken ABI - to check the cToken balance
const MOCK_CTOKEN_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function exchangeRate() external view returns (uint256)",
  "function balanceOf(address owner) external view returns (uint)",
  "function decimals() external pure returns (uint8)",
];

async function getLatestDeployment() {
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

  // Find MockCToken deployment
  const mockCTokenDeployment = deploymentData.transactions.find(
    (tx) => tx.contractName === "MockCToken"
  );

  if (!mockCTokenDeployment) {
    throw new Error("MockCToken deployment not found in latest deployment");
  }

  return mockCTokenDeployment.contractAddress;
}

async function addYield() {
  // Get environment variables
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const RPC_URL =
    process.env.SEPOLIA_RPC_URL || process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
  const YIELD_AMOUNT = process.env.YIELD_AMOUNT || "1000000"; // 1 USDC (6 decimals)
  const USE_LATEST_DEPLOYMENT = process.env.USE_LATEST_DEPLOYMENT === "true";

  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  let MOCK_CTOKEN_ADDRESS;

  if (USE_LATEST_DEPLOYMENT) {
    try {
      MOCK_CTOKEN_ADDRESS = await getLatestDeployment();
      console.log("📋 Using MockCToken address from latest deployment:", MOCK_CTOKEN_ADDRESS);
    } catch (error) {
      console.error("Failed to get latest deployment:", error.message);
      console.log("Falling back to MOCK_CTOKEN_ADDRESS environment variable");
      MOCK_CTOKEN_ADDRESS = process.env.MOCK_CTOKEN_ADDRESS;
    }
  } else {
    MOCK_CTOKEN_ADDRESS = process.env.MOCK_CTOKEN_ADDRESS;
  }

  if (!MOCK_CTOKEN_ADDRESS) {
    throw new Error(
      "MOCK_CTOKEN_ADDRESS environment variable is required when not using latest deployment"
    );
  }

  // Validate contract address
  if (!ethers.isAddress(MOCK_CTOKEN_ADDRESS)) {
    throw new Error("Invalid MOCK_CTOKEN_ADDRESS");
  }

  // Connect to the network
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("🔗 Connected to network:", await provider.getNetwork());
  console.log("👛 Wallet address:", wallet.address);
  console.log("🎯 MockCToken address:", MOCK_CTOKEN_ADDRESS);
  console.log("💰 Yield amount to add:", YIELD_AMOUNT, "USDC (6 decimals)");

  // Create contract instance
  const mockCToken = new ethers.Contract(MOCK_CTOKEN_ADDRESS, MOCK_CTOKEN_ABI, wallet);

  try {
    // Get current state before adding yield
    const currentBalance = await mockCToken.balanceOf(wallet.address);
    const currentTotalSupply = await mockCToken.totalSupply();
    const currentExchangeRate = await mockCToken.exchangeRate();
    const currentUnderlyingBalance = await mockCToken.balanceOf(wallet.address);
    const decimals = await mockCToken.decimals();

    console.log("\n📊 Current state:");
    console.log("💳 Current cToken balance:", ethers.formatUnits(currentBalance, decimals));
    console.log("📈 Current total supply:", ethers.formatUnits(currentTotalSupply, decimals));
    console.log("💱 Current exchange rate:", ethers.formatUnits(currentExchangeRate, 18));
    console.log("💰 Current underlying balance:", ethers.formatUnits(currentUnderlyingBalance, 6));

    // Add yield
    console.log("\n🌱 Adding yield...");
    const tx = await mockCToken.addYield(YIELD_AMOUNT);
    console.log("📝 Transaction hash:", tx.hash);

    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("⛽ Gas used:", receipt.gasUsed.toString());

    // Get new state after adding yield
    const newBalance = await mockCToken.balanceOf(wallet.address);
    const newTotalSupply = await mockCToken.totalSupply();
    const newExchangeRate = await mockCToken.exchangeRate();
    const newUnderlyingBalance = await mockCToken.balanceOf(wallet.address);

    console.log("\n📊 New state after yield:");
    console.log("💳 New cToken balance:", ethers.formatUnits(newBalance, decimals));
    console.log("📈 New total supply:", ethers.formatUnits(newTotalSupply, decimals));
    console.log("💱 New exchange rate:", ethers.formatUnits(newExchangeRate, 18));
    console.log("💰 New underlying balance:", ethers.formatUnits(newUnderlyingBalance, 6));

    // Calculate changes
    const balanceChange = newBalance - currentBalance;
    const totalSupplyChange = newTotalSupply - currentTotalSupply;
    const exchangeRateChange = newExchangeRate - currentExchangeRate;
    const underlyingBalanceChange = newUnderlyingBalance - currentUnderlyingBalance;

    console.log("\n📈 Changes:");
    console.log("💳 cToken balance change:", ethers.formatUnits(balanceChange, decimals));
    console.log("📈 Total supply change:", ethers.formatUnits(totalSupplyChange, decimals));
    console.log("💱 Exchange rate change:", ethers.formatUnits(exchangeRateChange, 18));
    console.log("💰 Underlying balance change:", ethers.formatUnits(underlyingBalanceChange, 6));

    console.log(
      "\n🎉 Successfully added",
      ethers.formatUnits(YIELD_AMOUNT, 6),
      "USDC worth of yield to the mock cToken"
    );
  } catch (error) {
    console.error("❌ Error adding yield:", error.message);
    process.exit(1);
  }
}

// Run the script
addYield().catch(console.error);
