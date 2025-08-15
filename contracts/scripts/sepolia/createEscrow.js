import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: "../.env" });

// EscrowFactory ABI - just the functions we need
const ESCROW_FACTORY_ABI = [
  "function createEscrow(string memory name, uint256 depositAmount, uint256 endTime, address oracle) external returns (address)",
  "function oracles(address) external view returns (bool)",
  "function getEscrows() external view returns (address[] memory)",
  "function platformToken() external view returns (address)",
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

  // Find EscrowFactory deployment
  const escrowFactoryDeployment = deploymentData.transactions.find(
    (tx) => tx.contractName === "EscrowFactory"
  );

  if (!escrowFactoryDeployment) {
    throw new Error("EscrowFactory deployment not found in latest deployment");
  }

  return escrowFactoryDeployment.contractAddress;
}

async function createEscrow() {
  // Get environment variables
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const RPC_URL =
    process.env.SEPOLIA_RPC_URL || process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
  const USE_LATEST_DEPLOYMENT = process.env.USE_LATEST_DEPLOYMENT === "true";

  // Escrow creation parameters
  const ESCROW_NAME = process.env.ESCROW_NAME || "Test Escrow";
  const DEPOSIT_AMOUNT = process.env.DEPOSIT_AMOUNT || "1000000"; // 1 CUT token (18 decimals)
  const END_TIME = process.env.END_TIME || Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
  const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS;

  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  if (!ORACLE_ADDRESS) {
    throw new Error("ORACLE_ADDRESS environment variable is required");
  }

  // Validate oracle address
  if (!ethers.isAddress(ORACLE_ADDRESS)) {
    throw new Error("Invalid ORACLE_ADDRESS");
  }

  let ESCROW_FACTORY_ADDRESS;

  if (USE_LATEST_DEPLOYMENT) {
    try {
      ESCROW_FACTORY_ADDRESS = await getLatestDeployment();
      console.log("📋 Using EscrowFactory address from latest deployment:", ESCROW_FACTORY_ADDRESS);
    } catch (error) {
      console.error("Failed to get latest deployment:", error.message);
      console.log("Falling back to ESCROW_FACTORY_ADDRESS environment variable");
      ESCROW_FACTORY_ADDRESS = process.env.ESCROW_FACTORY_ADDRESS;
    }
  } else {
    ESCROW_FACTORY_ADDRESS = process.env.ESCROW_FACTORY_ADDRESS;
  }

  if (!ESCROW_FACTORY_ADDRESS) {
    throw new Error(
      "ESCROW_FACTORY_ADDRESS environment variable is required when not using latest deployment"
    );
  }

  // Validate contract address
  if (!ethers.isAddress(ESCROW_FACTORY_ADDRESS)) {
    throw new Error("Invalid ESCROW_FACTORY_ADDRESS");
  }

  // Connect to the network
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("🔗 Connected to network:", await provider.getNetwork());
  console.log("👛 Wallet address:", wallet.address);
  console.log("🏭 EscrowFactory address:", ESCROW_FACTORY_ADDRESS);
  console.log("🔮 Oracle address:", ORACLE_ADDRESS);
  console.log("📝 Escrow name:", ESCROW_NAME);
  console.log("💰 Deposit amount:", DEPOSIT_AMOUNT, "tokens (18 decimals)");
  console.log("⏰ End time:", new Date(END_TIME * 1000).toISOString());

  // Create contract instance
  const escrowFactory = new ethers.Contract(ESCROW_FACTORY_ADDRESS, ESCROW_FACTORY_ABI, wallet);

  try {
    // Check if the oracle is approved
    const isOracle = await escrowFactory.oracles(ORACLE_ADDRESS);
    if (!isOracle) {
      throw new Error(`Address ${ORACLE_ADDRESS} is not an approved oracle`);
    }
    console.log("✅ Oracle is approved");

    // Get platform token address
    const platformToken = await escrowFactory.platformToken();
    console.log("🎯 Platform token address:", platformToken);

    // Get current escrows count
    const currentEscrows = await escrowFactory.getEscrows();
    console.log("📊 Current number of escrows:", currentEscrows.length);

    // Create escrow
    console.log("\n🏗️ Creating escrow...");
    const tx = await escrowFactory.createEscrow(
      ESCROW_NAME,
      DEPOSIT_AMOUNT,
      END_TIME,
      ORACLE_ADDRESS
    );
    console.log("📝 Transaction hash:", tx.hash);

    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("⛽ Gas used:", receipt.gasUsed.toString());

    // Get the new escrow address from the event
    const escrowCreatedEvent = receipt.logs.find((log) => {
      try {
        const parsed = escrowFactory.interface.parseLog(log);
        return parsed.name === "EscrowCreated";
      } catch {
        return false;
      }
    });

    if (escrowCreatedEvent) {
      const parsed = escrowFactory.interface.parseLog(escrowCreatedEvent);
      const escrowAddress = parsed.args.escrow;
      console.log("🏦 New escrow address:", escrowAddress);
    }

    // Get updated escrows count
    const updatedEscrows = await escrowFactory.getEscrows();
    console.log("📊 Updated number of escrows:", updatedEscrows.length);

    console.log(
      "\n🎉 Successfully created escrow:",
      ESCROW_NAME,
      "with deposit amount:",
      ethers.formatUnits(DEPOSIT_AMOUNT, 18),
      "CUT tokens"
    );
  } catch (error) {
    console.error("❌ Error creating escrow:", error.message);
    process.exit(1);
  }
}

// Run the script
createEscrow().catch(console.error);
