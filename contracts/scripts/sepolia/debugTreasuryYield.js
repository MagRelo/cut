import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: "../.env" });

// Treasury ABI - including internal functions for debugging
const TREASURY_ABI = [
  "function getExchangeRate() external view returns (uint256)",
  "function getTreasuryBalance() external view returns (uint256)",
  "function getPlatformTokenSupply() external view returns (uint256)",
  "function totalUSDCBalance() external view returns (uint256)",
  "function totalPlatformTokensMinted() external view returns (uint256)",
  // Add the internal function for debugging (if it's accessible)
  "function getCompoundYield() external view returns (uint256)",
];

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

  // Find Treasury and MockCToken deployments
  const treasuryDeployment = deploymentData.transactions.find(
    (tx) => tx.contractName === "Treasury"
  );
  const mockCTokenDeployment = deploymentData.transactions.find(
    (tx) => tx.contractName === "MockCToken"
  );

  if (!treasuryDeployment) {
    throw new Error("Treasury deployment not found in latest deployment");
  }
  if (!mockCTokenDeployment) {
    throw new Error("MockCToken deployment not found in latest deployment");
  }

  return {
    treasury: treasuryDeployment.contractAddress,
    mockCToken: mockCTokenDeployment.contractAddress,
  };
}

async function debugTreasuryYield() {
  // Get environment variables
  const RPC_URL =
    process.env.SEPOLIA_RPC_URL || process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
  const USE_LATEST_DEPLOYMENT = process.env.USE_LATEST_DEPLOYMENT === "true";

  let TREASURY_ADDRESS, MOCK_CTOKEN_ADDRESS;

  if (USE_LATEST_DEPLOYMENT) {
    try {
      const addresses = await getLatestDeployment();
      TREASURY_ADDRESS = addresses.treasury;
      MOCK_CTOKEN_ADDRESS = addresses.mockCToken;
      console.log("📋 Using addresses from latest deployment:");
      console.log("  Treasury:", TREASURY_ADDRESS);
      console.log("  MockCToken:", MOCK_CTOKEN_ADDRESS);
    } catch (error) {
      console.error("Failed to get latest deployment:", error.message);
      console.log("Falling back to environment variables");
      TREASURY_ADDRESS = process.env.TREASURY_ADDRESS;
      MOCK_CTOKEN_ADDRESS = process.env.MOCK_CTOKEN_ADDRESS;
    }
  } else {
    TREASURY_ADDRESS = process.env.TREASURY_ADDRESS;
    MOCK_CTOKEN_ADDRESS = process.env.MOCK_CTOKEN_ADDRESS;
  }

  if (!TREASURY_ADDRESS || !MOCK_CTOKEN_ADDRESS) {
    throw new Error("TREASURY_ADDRESS and MOCK_CTOKEN_ADDRESS environment variables are required");
  }

  // Validate contract addresses
  if (!ethers.isAddress(TREASURY_ADDRESS)) {
    throw new Error("Invalid TREASURY_ADDRESS");
  }
  if (!ethers.isAddress(MOCK_CTOKEN_ADDRESS)) {
    throw new Error("Invalid MOCK_CTOKEN_ADDRESS");
  }

  // Connect to the network
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  console.log("🔗 Connected to network:", await provider.getNetwork());
  console.log("🎯 Treasury address:", TREASURY_ADDRESS);
  console.log("🎯 MockCToken address:", MOCK_CTOKEN_ADDRESS);

  // Create contract instances
  const treasury = new ethers.Contract(TREASURY_ADDRESS, TREASURY_ABI, provider);
  const mockCToken = new ethers.Contract(MOCK_CTOKEN_ADDRESS, MOCK_CTOKEN_ABI, provider);

  try {
    console.log("\n🔍 Debugging Treasury Yield Calculation:");

    // Get raw values
    const totalUSDCBalance = await treasury.totalUSDCBalance();
    const treasuryBalance = await treasury.getTreasuryBalance();
    const cTokenBalance = await mockCToken.balanceOf(TREASURY_ADDRESS);
    const underlyingBalance = await mockCToken.balanceOf(TREASURY_ADDRESS);
    const exchangeRate = await mockCToken.exchangeRate();
    const decimals = await mockCToken.decimals();

    console.log("\n📊 Raw Values:");
    console.log("💰 totalUSDCBalance:", totalUSDCBalance.toString());
    console.log("🏦 treasuryBalance:", treasuryBalance.toString());
    console.log("💳 cTokenBalance:", cTokenBalance.toString());
    console.log("💰 underlyingBalance:", underlyingBalance.toString());
    console.log("💱 exchangeRate:", exchangeRate.toString());
    console.log("🔢 decimals:", decimals.toString());

    console.log("\n📊 Formatted Values:");
    console.log("💰 totalUSDCBalance:", ethers.formatUnits(totalUSDCBalance, 6), "USDC");
    console.log("🏦 treasuryBalance:", ethers.formatUnits(treasuryBalance, 6), "USDC");
    console.log("💳 cTokenBalance:", ethers.formatUnits(cTokenBalance, decimals));
    console.log("💰 underlyingBalance:", ethers.formatUnits(underlyingBalance, 6), "USDC");
    console.log("💱 exchangeRate:", ethers.formatUnits(exchangeRate, 18));

    // Manual calculations
    const expectedYield = underlyingBalance - totalUSDCBalance;
    const actualYield = treasuryBalance - totalUSDCBalance;

    console.log("\n🧮 Manual Calculations:");
    console.log(
      "💰 Expected Yield (underlying - total):",
      ethers.formatUnits(expectedYield, 6),
      "USDC"
    );
    console.log("🌱 Actual Yield (treasury - total):", ethers.formatUnits(actualYield, 6), "USDC");

    // Try to call getCompoundYield directly
    try {
      const compoundYield = await treasury.getCompoundYield();
      console.log("🔍 Direct getCompoundYield():", ethers.formatUnits(compoundYield, 6), "USDC");
    } catch (error) {
      console.log("❌ getCompoundYield() call failed:", error.message);
    }

    // Check if the issue is with the cToken balanceOf function
    console.log("\n🔍 Checking cToken balanceOf behavior:");
    console.log("💳 cToken.balanceOf(Treasury):", ethers.formatUnits(underlyingBalance, 6), "USDC");
    console.log("💰 cToken.balanceOf(Treasury):", ethers.formatUnits(underlyingBalance, 6), "USDC");

    // Calculate what balanceOf should return if it returns underlying value
    const calculatedUnderlying = (cTokenBalance * exchangeRate) / ethers.parseUnits("1", 18);
    console.log(
      "🧮 Calculated underlying from cToken balance:",
      ethers.formatUnits(calculatedUnderlying, 6),
      "USDC"
    );
  } catch (error) {
    console.error("❌ Error debugging Treasury yield:", error.message);
    process.exit(1);
  }
}

// Run the script
debugTreasuryYield().catch(console.error);
