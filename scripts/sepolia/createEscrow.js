import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), "contracts", ".env") });

// EscrowFactory ABI - just the functions we need
const ESCROW_FACTORY_ABI = [
  "function createEscrow(uint256 depositAmount, uint256 expiry, address paymentToken, uint8 paymentTokenDecimals, address oracle, uint256 oracleFee) external returns (address)",
  "function getEscrows() external view returns (address[] memory)",
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

  // Find EscrowFactory and PlatformToken deployments
  const escrowFactoryDeployment = deploymentData.transactions.find(
    (tx) => tx.contractName === "EscrowFactory"
  );
  const platformTokenDeployment = deploymentData.transactions.find(
    (tx) => tx.contractName === "PlatformToken"
  );

  if (!escrowFactoryDeployment) {
    throw new Error("EscrowFactory deployment not found in latest deployment");
  }
  if (!platformTokenDeployment) {
    throw new Error("PlatformToken deployment not found in latest deployment");
  }

  return {
    escrowFactory: escrowFactoryDeployment.contractAddress,
    platformToken: platformTokenDeployment.contractAddress,
  };
}

async function createEscrow() {
  // Get environment variables
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const RPC_URL =
    process.env.SEPOLIA_RPC_URL || process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
  const USE_LATEST_DEPLOYMENT = process.env.USE_LATEST_DEPLOYMENT === "true";

  // Escrow creation parameters
  const DEPOSIT_AMOUNT = process.env.DEPOSIT_AMOUNT || "1000000000000000000"; // 1 CUT token (18 decimals)
  const END_TIME = process.env.END_TIME || Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
  const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS;
  const ORACLE_FEE = process.env.ORACLE_FEE || "500"; // 5% (500 basis points)

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

  let ESCROW_FACTORY_ADDRESS, PLATFORM_TOKEN_ADDRESS;

  if (USE_LATEST_DEPLOYMENT) {
    try {
      const addresses = await getLatestDeployment();
      ESCROW_FACTORY_ADDRESS = addresses.escrowFactory;
      PLATFORM_TOKEN_ADDRESS = addresses.platformToken;
      console.log("📋 Using addresses from latest deployment:");
      console.log("  EscrowFactory:", ESCROW_FACTORY_ADDRESS);
      console.log("  PlatformToken:", PLATFORM_TOKEN_ADDRESS);
    } catch (error) {
      console.error("Failed to get latest deployment:", error.message);
      console.log("Falling back to environment variables");
      ESCROW_FACTORY_ADDRESS = process.env.ESCROW_FACTORY_ADDRESS;
      PLATFORM_TOKEN_ADDRESS = process.env.PLATFORM_TOKEN_ADDRESS;
    }
  } else {
    ESCROW_FACTORY_ADDRESS = process.env.ESCROW_FACTORY_ADDRESS;
    PLATFORM_TOKEN_ADDRESS = process.env.PLATFORM_TOKEN_ADDRESS;
  }

  if (!ESCROW_FACTORY_ADDRESS) {
    throw new Error(
      "ESCROW_FACTORY_ADDRESS environment variable is required when not using latest deployment"
    );
  }

  if (!PLATFORM_TOKEN_ADDRESS) {
    throw new Error(
      "PLATFORM_TOKEN_ADDRESS environment variable is required when not using latest deployment"
    );
  }

  // Validate contract addresses
  if (!ethers.isAddress(ESCROW_FACTORY_ADDRESS)) {
    throw new Error("Invalid ESCROW_FACTORY_ADDRESS");
  }
  if (!ethers.isAddress(PLATFORM_TOKEN_ADDRESS)) {
    throw new Error("Invalid PLATFORM_TOKEN_ADDRESS");
  }

  // Connect to the network
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("🔗 Connected to network:", await provider.getNetwork());
  console.log("👛 Wallet address:", wallet.address);
  console.log("🏭 EscrowFactory address:", ESCROW_FACTORY_ADDRESS);
  console.log("🎯 PlatformToken address:", PLATFORM_TOKEN_ADDRESS);
  console.log("🔮 Oracle address:", ORACLE_ADDRESS);
  console.log("💰 Deposit amount:", ethers.formatUnits(DEPOSIT_AMOUNT, 18), "CUT tokens");
  console.log("⏰ End time:", new Date(END_TIME * 1000).toISOString());
  console.log("💸 Oracle fee:", ethers.formatUnits(ORACLE_FEE, 2), "%");

  // Create contract instance
  const escrowFactory = new ethers.Contract(ESCROW_FACTORY_ADDRESS, ESCROW_FACTORY_ABI, wallet);

  try {
    // Get current escrows count
    const currentEscrows = await escrowFactory.getEscrows();
    console.log("📊 Current number of escrows:", currentEscrows.length);

    // Create escrow
    console.log("\n🏗️ Creating escrow...");
    const tx = await escrowFactory.createEscrow(
      DEPOSIT_AMOUNT, // depositAmount
      END_TIME, // expiry
      PLATFORM_TOKEN_ADDRESS, // paymentToken (CUT token)
      18, // paymentTokenDecimals (CUT has 18 decimals)
      ORACLE_ADDRESS, // oracle
      ORACLE_FEE // oracleFee
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
      const host = parsed.args.host;
      const depositAmount = parsed.args.depositAmount;
      console.log("🏦 New escrow address:", escrowAddress);
      console.log("👤 Host address:", host);
      console.log(
        "💰 Deposit amount from event:",
        ethers.formatUnits(depositAmount, 18),
        "CUT tokens"
      );
    }

    // Get updated escrows count
    const updatedEscrows = await escrowFactory.getEscrows();
    console.log("📊 Updated number of escrows:", updatedEscrows.length);

    console.log(
      "\n🎉 Successfully created escrow with deposit amount:",
      ethers.formatUnits(DEPOSIT_AMOUNT, 18),
      "CUT tokens"
    );
  } catch (error) {
    console.error("❌ Error creating escrow:", error.message);

    // Try to decode custom errors if available
    if (error.data) {
      console.error("📋 Error data:", error.data);

      // Common custom error signatures
      const errorSignatures = {
        "0x8456cb59": "Pausable: paused",
        "0x4e487b71": "Panic error",
      };

      const errorSignature = error.data.slice(0, 10);
      const knownError = errorSignatures[errorSignature];

      if (knownError) {
        console.error(`🔍 Detected error: ${knownError}`);
      }
    }

    // Additional debugging information
    console.error("🔍 Debug information:");
    console.error("  - Error name:", error.name);
    console.error("  - Error code:", error.code);
    console.error("  - Transaction:", error.transaction);

    process.exit(1);
  }
}

// Run the script
createEscrow().catch(console.error);
