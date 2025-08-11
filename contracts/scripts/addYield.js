import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: "../.env" });

// MockCToken ABI - to check the cToken balance
const MOCK_CTOKEN_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function addYield(address to, uint256 yieldAmount) external",
  "function underlying() external view returns (address)",
  "function underlyingBalance(address owner) external view returns (uint256)",
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

  // Find TokenManager deployment
  const tokenManagerDeployment = deploymentData.transactions.find(
    (tx) => tx.contractName === "TokenManager"
  );

  if (!tokenManagerDeployment) {
    throw new Error("TokenManager deployment not found in latest deployment");
  }

  return {
    mockCTokenAddress: mockCTokenDeployment.contractAddress,
    tokenManagerAddress: tokenManagerDeployment.contractAddress,
  };
}

async function addYield() {
  // Get environment variables
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
  const YIELD_AMOUNT = process.env.YIELD_AMOUNT || "1000000"; // 1 USDC (6 decimals)
  const YIELD_RECIPIENT = process.env.YIELD_RECIPIENT; // Address to receive yield
  const USE_LATEST_DEPLOYMENT = process.env.USE_LATEST_DEPLOYMENT === "true";

  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  let MOCK_CTOKEN_ADDRESS;
  let TOKEN_MANAGER_ADDRESS;

  if (USE_LATEST_DEPLOYMENT) {
    try {
      const deployment = await getLatestDeployment();
      MOCK_CTOKEN_ADDRESS = deployment.mockCTokenAddress;
      TOKEN_MANAGER_ADDRESS = deployment.tokenManagerAddress;
      console.log("📋 Using addresses from latest deployment:");
      console.log("  MockCToken:", MOCK_CTOKEN_ADDRESS);
      console.log("  TokenManager:", TOKEN_MANAGER_ADDRESS);
    } catch (error) {
      console.error("Failed to get latest deployment:", error.message);
      console.log("Falling back to environment variables");
      MOCK_CTOKEN_ADDRESS = process.env.MOCK_CTOKEN_ADDRESS;
      TOKEN_MANAGER_ADDRESS = process.env.TOKEN_MANAGER_ADDRESS;
    }
  } else {
    MOCK_CTOKEN_ADDRESS = process.env.MOCK_CTOKEN_ADDRESS;
    TOKEN_MANAGER_ADDRESS = process.env.TOKEN_MANAGER_ADDRESS;
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

  // Use TokenManager as default recipient if not specified
  const recipientAddress = YIELD_RECIPIENT || TOKEN_MANAGER_ADDRESS;

  if (!recipientAddress) {
    throw new Error(
      "No recipient address specified. Set YIELD_RECIPIENT or ensure TOKEN_MANAGER_ADDRESS is available."
    );
  }

  console.log("🔗 Connected to network:", await provider.getNetwork());
  console.log("👛 Wallet address:", wallet.address);
  console.log("🎯 MockCToken address:", MOCK_CTOKEN_ADDRESS);
  console.log("💰 Yield amount to add:", YIELD_AMOUNT, "USDC (6 decimals)");
  console.log("🎁 Yield recipient:", recipientAddress);
  console.log("🎁 Yield amount in wei:", YIELD_AMOUNT);

  // Create contract instance
  const mockCToken = new ethers.Contract(MOCK_CTOKEN_ADDRESS, MOCK_CTOKEN_ABI, wallet);

  // Get underlying token address and create instance
  const underlyingAddress = await mockCToken.underlying();
  console.log("💎 Underlying token address:", underlyingAddress);

  // Create underlying token contract instance (PaymentToken)
  const underlyingToken = new ethers.Contract(
    underlyingAddress,
    [
      "function balanceOf(address owner) external view returns (uint256)",
      "function symbol() external view returns (string)",
    ],
    wallet
  );

  const underlyingSymbol = await underlyingToken.symbol();
  const mockCTokenUnderlyingBalance = await underlyingToken.balanceOf(MOCK_CTOKEN_ADDRESS);
  console.log(
    `💎 MockCToken ${underlyingSymbol} balance:`,
    ethers.formatUnits(mockCTokenUnderlyingBalance, 6)
  );

  try {
    // Get current state before adding yield
    const currentBalance = await mockCToken.balanceOf(recipientAddress);
    const currentTotalSupply = await mockCToken.totalSupply();
    const currentUnderlyingBalance = await mockCToken.underlyingBalance(recipientAddress);

    console.log("\n📊 Current state:");
    console.log("💳 Current cToken balance:", ethers.formatUnits(currentBalance, 6));
    console.log("📈 Current total supply:", ethers.formatUnits(currentTotalSupply, 6));
    console.log("💰 Current underlying balance:", ethers.formatUnits(currentUnderlyingBalance, 6));

    // Add yield
    console.log("\n🌱 Adding yield...");
    const tx = await mockCToken.addYield(recipientAddress, YIELD_AMOUNT);
    console.log("📝 Transaction hash:", tx.hash);

    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("⛽ Gas used:", receipt.gasUsed.toString());

    // Get new state after adding yield
    const newBalance = await mockCToken.balanceOf(recipientAddress);
    const newTotalSupply = await mockCToken.totalSupply();
    const newUnderlyingBalance = await mockCToken.underlyingBalance(recipientAddress);

    console.log("\n📊 New state after yield:");
    console.log("💳 New cToken balance:", ethers.formatUnits(newBalance, 6));
    console.log("📈 New total supply:", ethers.formatUnits(newTotalSupply, 6));
    console.log("💰 New underlying balance:", ethers.formatUnits(newUnderlyingBalance, 6));

    // Calculate changes
    const balanceChange = newBalance - currentBalance;
    const totalSupplyChange = newTotalSupply - currentTotalSupply;
    const underlyingBalanceChange = newUnderlyingBalance - currentUnderlyingBalance;

    console.log("\n📈 Changes:");
    console.log("💳 cToken balance change:", ethers.formatUnits(balanceChange, 6));
    console.log("📈 Total supply change:", ethers.formatUnits(totalSupplyChange, 6));
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
