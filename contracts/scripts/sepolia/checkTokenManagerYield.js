import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: "../.env" });

// TokenManager ABI - functions to check yield status
const TOKEN_MANAGER_ABI = [
  "function getExchangeRate() external view returns (uint256)",
  "function getTokenManagerBalance() external view returns (uint256)",
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

  // Find TokenManager and MockCToken deployments
  const tokenManagerDeployment = deploymentData.transactions.find(
    (tx) => tx.contractName === "TokenManager"
  );
  const mockCTokenDeployment = deploymentData.transactions.find(
    (tx) => tx.contractName === "MockCToken"
  );

  if (!tokenManagerDeployment) {
    throw new Error("TokenManager deployment not found in latest deployment");
  }
  if (!mockCTokenDeployment) {
    throw new Error("MockCToken deployment not found in latest deployment");
  }

  return {
    tokenManager: tokenManagerDeployment.contractAddress,
    mockCToken: mockCTokenDeployment.contractAddress,
  };
}

async function checkTokenManagerYield() {
  // Get environment variables
  const RPC_URL =
    process.env.SEPOLIA_RPC_URL || process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
  const USE_LATEST_DEPLOYMENT = process.env.USE_LATEST_DEPLOYMENT === "true";

  let TOKEN_MANAGER_ADDRESS, MOCK_CTOKEN_ADDRESS;

  if (USE_LATEST_DEPLOYMENT) {
    try {
      const addresses = await getLatestDeployment();
      TOKEN_MANAGER_ADDRESS = addresses.tokenManager;
      MOCK_CTOKEN_ADDRESS = addresses.mockCToken;
      console.log("📋 Using addresses from latest deployment:");
      console.log("  TokenManager:", TOKEN_MANAGER_ADDRESS);
      console.log("  MockCToken:", MOCK_CTOKEN_ADDRESS);
    } catch (error) {
      console.error("Failed to get latest deployment:", error.message);
      console.log("Falling back to environment variables");
      TOKEN_MANAGER_ADDRESS = process.env.TOKEN_MANAGER_ADDRESS;
      MOCK_CTOKEN_ADDRESS = process.env.MOCK_CTOKEN_ADDRESS;
    }
  } else {
    TOKEN_MANAGER_ADDRESS = process.env.TOKEN_MANAGER_ADDRESS;
    MOCK_CTOKEN_ADDRESS = process.env.MOCK_CTOKEN_ADDRESS;
  }

  if (!TOKEN_MANAGER_ADDRESS || !MOCK_CTOKEN_ADDRESS) {
    throw new Error(
      "TOKEN_MANAGER_ADDRESS and MOCK_CTOKEN_ADDRESS environment variables are required"
    );
  }

  // Validate contract addresses
  if (!ethers.isAddress(TOKEN_MANAGER_ADDRESS)) {
    throw new Error("Invalid TOKEN_MANAGER_ADDRESS");
  }
  if (!ethers.isAddress(MOCK_CTOKEN_ADDRESS)) {
    throw new Error("Invalid MOCK_CTOKEN_ADDRESS");
  }

  // Connect to the network
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  console.log("🔗 Connected to network:", await provider.getNetwork());
  console.log("🎯 TokenManager address:", TOKEN_MANAGER_ADDRESS);
  console.log("🎯 MockCToken address:", MOCK_CTOKEN_ADDRESS);

  // Create contract instances
  const tokenManager = new ethers.Contract(TOKEN_MANAGER_ADDRESS, TOKEN_MANAGER_ABI, provider);
  const mockCToken = new ethers.Contract(MOCK_CTOKEN_ADDRESS, MOCK_CTOKEN_ABI, provider);

  try {
    console.log("\n📊 TokenManager Status:");

    // Get TokenManager metrics
    const exchangeRate = await tokenManager.getExchangeRate();
    const tokenManagerBalance = await tokenManager.getTokenManagerBalance();
    const platformTokenSupply = await tokenManager.getPlatformTokenSupply();
    const totalUSDCBalance = await tokenManager.totalUSDCBalance();
    const totalPlatformTokensMinted = await tokenManager.totalPlatformTokensMinted();

    console.log("💱 Exchange Rate:", ethers.formatUnits(exchangeRate, 18));
    console.log("💰 TokenManager Balance:", ethers.formatUnits(tokenManagerBalance, 6), "USDC");
    console.log("🏦 Platform Token Supply:", ethers.formatUnits(platformTokenSupply, 18));
    console.log("📥 Total USDC Balance:", ethers.formatUnits(totalUSDCBalance, 6), "USDC");
    console.log(
      "🪙 Total Platform Tokens Minted:",
      ethers.formatUnits(totalPlatformTokensMinted, 18)
    );

    console.log("\n📊 MockCToken Status:");

    // Get MockCToken metrics for TokenManager
    const tokenManagerCTokenBalance = await mockCToken.balanceOf(TOKEN_MANAGER_ADDRESS);
    const cTokenTotalSupply = await mockCToken.totalSupply();
    const cTokenExchangeRate = await mockCToken.exchangeRate();
    // Check the underlying balance in the mock cToken
    const tokenManagerUnderlyingBalance = await mockCToken.balanceOf(TOKEN_MANAGER_ADDRESS);
    const decimals = await mockCToken.decimals();

    console.log(
      "💳 TokenManager cToken Balance:",
      ethers.formatUnits(tokenManagerCTokenBalance, decimals)
    );
    console.log("📈 cToken Total Supply:", ethers.formatUnits(cTokenTotalSupply, decimals));
    console.log("💱 cToken Exchange Rate:", ethers.formatUnits(cTokenExchangeRate, 18));
    console.log(
      "💰 TokenManager Underlying Balance:",
      ethers.formatUnits(tokenManagerUnderlyingBalance, 6),
      "USDC"
    );

    // Calculate expected yield
    const expectedYield = tokenManagerUnderlyingBalance - totalUSDCBalance;
    const actualYield = tokenManagerBalance - totalUSDCBalance;
    console.log("\n📈 Yield Analysis:");
    console.log(
      "💰 Expected Yield (cToken underlying - TokenManager total):",
      ethers.formatUnits(expectedYield, 6),
      "USDC"
    );
    console.log(
      "🌱 Actual Yield (TokenManager calculation):",
      ethers.formatUnits(actualYield, 6),
      "USDC"
    );

    if (expectedYield > 0) {
      console.log("✅ Yield is being tracked!");
    } else {
      console.log("❌ No yield detected yet");
    }
  } catch (error) {
    console.error("❌ Error checking TokenManager yield:", error.message);
    process.exit(1);
  }
}

// Run the script
checkTokenManagerYield().catch(console.error);
