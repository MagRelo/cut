import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: "../.env" });

// Treasury ABI - functions to check yield status
const TREASURY_ABI = [
  "function getExchangeRate() external view returns (uint256)",
  "function getTreasuryBalance() external view returns (uint256)",
  "function getPlatformTokenSupply() external view returns (uint256)",
  "function totalUSDCBalance() external view returns (uint256)",
  "function totalPlatformTokensMinted() external view returns (uint256)",
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

async function checkTreasuryYield() {
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
    console.log("\n📊 Treasury Status:");

    // Get Treasury metrics
    const exchangeRate = await treasury.getExchangeRate();
    const treasuryBalance = await treasury.getTreasuryBalance();
    const platformTokenSupply = await treasury.getPlatformTokenSupply();
    const totalUSDCBalance = await treasury.totalUSDCBalance();
    const totalPlatformTokensMinted = await treasury.totalPlatformTokensMinted();

    console.log("💱 Exchange Rate:", ethers.formatUnits(exchangeRate, 18));
    console.log("💰 Treasury Balance:", ethers.formatUnits(treasuryBalance, 6), "USDC");
    console.log("🏦 Platform Token Supply:", ethers.formatUnits(platformTokenSupply, 18));
    console.log("📥 Total USDC Balance:", ethers.formatUnits(totalUSDCBalance, 6), "USDC");
    console.log(
      "🪙 Total Platform Tokens Minted:",
      ethers.formatUnits(totalPlatformTokensMinted, 18)
    );

    console.log("\n📊 MockCToken Status:");

    // Get MockCToken metrics for Treasury
    const treasuryCTokenBalance = await mockCToken.balanceOf(TREASURY_ADDRESS);
    const cTokenTotalSupply = await mockCToken.totalSupply();
    const cTokenExchangeRate = await mockCToken.exchangeRate();
    // Check the underlying balance in the mock cToken
    const treasuryUnderlyingBalance = await mockCToken.balanceOf(TREASURY_ADDRESS);
    const decimals = await mockCToken.decimals();

    console.log("💳 Treasury cToken Balance:", ethers.formatUnits(treasuryCTokenBalance, decimals));
    console.log("📈 cToken Total Supply:", ethers.formatUnits(cTokenTotalSupply, decimals));
    console.log("💱 cToken Exchange Rate:", ethers.formatUnits(cTokenExchangeRate, 18));
    console.log(
      "💰 Treasury Underlying Balance:",
      ethers.formatUnits(treasuryUnderlyingBalance, 6),
      "USDC"
    );

    // Calculate expected yield
    const expectedYield = treasuryUnderlyingBalance - totalUSDCBalance;
    const actualYield = treasuryBalance - totalUSDCBalance;
    console.log("\n📈 Yield Analysis:");
    console.log(
      "💰 Expected Yield (cToken underlying - Treasury total):",
      ethers.formatUnits(expectedYield, 6),
      "USDC"
    );
    console.log(
      "🌱 Actual Yield (Treasury calculation):",
      ethers.formatUnits(actualYield, 6),
      "USDC"
    );

    if (expectedYield > 0) {
      console.log("✅ Yield is being tracked!");
    } else {
      console.log("❌ No yield detected yet");
    }
  } catch (error) {
    console.error("❌ Error checking Treasury yield:", error.message);
    process.exit(1);
  }
}

// Run the script
checkTreasuryYield().catch(console.error);
