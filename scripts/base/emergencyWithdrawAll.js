import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), "contracts", ".env") });

// DepositManager ABI - just the functions we need
const DEPOSIT_MANAGER_ABI = [
  "function emergencyWithdrawAll(address to) external",
  "function getTokenManagerUSDCBalance() external view returns (uint256)",
  "function getCompoundUSDCBalance() external view returns (uint256)",
  "function getTotalAvailableBalance() external view returns (uint256)",
];

// Real USDC ABI (Base network)
const USDC_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external pure returns (uint8)",
];

// PlatformToken (CUT) ABI
const PLATFORM_TOKEN_ABI = [
  "function totalSupply() external view returns (uint256)",
  "function decimals() external pure returns (uint8)",
];

async function getLatestDeployment() {
  const broadcastDir = path.join(process.cwd(), "contracts", "broadcast", "Deploy_base.s.sol");

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

  // Find DepositManager and PlatformToken deployments
  const depositManagerDeployment = deploymentData.transactions.find(
    (tx) => tx.contractName === "DepositManager"
  );
  const platformTokenDeployment = deploymentData.transactions.find(
    (tx) => tx.contractName === "PlatformToken"
  );

  if (!depositManagerDeployment) {
    throw new Error("DepositManager deployment not found in latest deployment");
  }
  if (!platformTokenDeployment) {
    throw new Error("PlatformToken deployment not found in latest deployment");
  }

  // Real USDC address on Base network
  const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7c32D4f71b54bdA02913";

  return {
    depositManager: depositManagerDeployment.contractAddress,
    usdc: USDC_ADDRESS,
    platformToken: platformTokenDeployment.contractAddress,
  };
}

async function emergencyWithdrawAll() {
  // Get environment variables
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";
  const USE_LATEST_DEPLOYMENT = process.env.USE_LATEST_DEPLOYMENT === "true";

  // Recipient address - defaults to wallet address if not specified
  const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS;

  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  let DEPOSIT_MANAGER_ADDRESS, USDC_ADDRESS, PLATFORM_TOKEN_ADDRESS;

  if (USE_LATEST_DEPLOYMENT) {
    try {
      const addresses = await getLatestDeployment();
      DEPOSIT_MANAGER_ADDRESS = addresses.depositManager;
      USDC_ADDRESS = addresses.usdc.toLowerCase();
      PLATFORM_TOKEN_ADDRESS = addresses.platformToken;
      console.log("📋 Using addresses from latest deployment:");
      console.log("  DepositManager:", DEPOSIT_MANAGER_ADDRESS);
      console.log("  USDC:", USDC_ADDRESS);
      console.log("  PlatformToken:", PLATFORM_TOKEN_ADDRESS);
    } catch (error) {
      console.error("Failed to get latest deployment:", error.message);
      console.log("Falling back to environment variables");
      DEPOSIT_MANAGER_ADDRESS = process.env.DEPOSIT_MANAGER_ADDRESS;
      USDC_ADDRESS = process.env.USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7c32D4f71b54bdA02913";
      PLATFORM_TOKEN_ADDRESS = process.env.PLATFORM_TOKEN_ADDRESS;
    }
  } else {
    DEPOSIT_MANAGER_ADDRESS = process.env.DEPOSIT_MANAGER_ADDRESS;
    USDC_ADDRESS = process.env.USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7c32D4f71b54bdA02913";
    PLATFORM_TOKEN_ADDRESS = process.env.PLATFORM_TOKEN_ADDRESS;
  }

  if (!DEPOSIT_MANAGER_ADDRESS || !USDC_ADDRESS || !PLATFORM_TOKEN_ADDRESS) {
    throw new Error(
      "DEPOSIT_MANAGER_ADDRESS, USDC_ADDRESS, and PLATFORM_TOKEN_ADDRESS environment variables are required when not using latest deployment"
    );
  }

  // Validate contract addresses
  if (!ethers.isAddress(DEPOSIT_MANAGER_ADDRESS)) {
    throw new Error("Invalid DEPOSIT_MANAGER_ADDRESS");
  }
  if (!ethers.isAddress(PLATFORM_TOKEN_ADDRESS)) {
    throw new Error("Invalid PLATFORM_TOKEN_ADDRESS");
  }
  if (!ethers.isAddress(USDC_ADDRESS)) {
    throw new Error("Invalid USDC_ADDRESS");
  }

  // Connect to the network
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  // Set recipient to wallet address if not specified
  const recipientAddress = RECIPIENT_ADDRESS || wallet.address;

  if (!ethers.isAddress(recipientAddress)) {
    throw new Error("Invalid RECIPIENT_ADDRESS");
  }

  console.log("🔗 Connected to network:", await provider.getNetwork());
  console.log("👛 Wallet address:", wallet.address);
  console.log("📬 Recipient address:", recipientAddress);

  // Create contract instances
  const depositManager = new ethers.Contract(DEPOSIT_MANAGER_ADDRESS, DEPOSIT_MANAGER_ABI, wallet);
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);
  const platformToken = new ethers.Contract(PLATFORM_TOKEN_ADDRESS, PLATFORM_TOKEN_ABI, wallet);

  try {
    // Get DepositManager stats before withdrawal
    console.log("\n📊 Pre-withdrawal status:");

    let tokenManagerBalanceBefore,
      compoundBalanceBefore,
      totalAvailableBalanceBefore,
      platformTokenSupplyBefore,
      recipientUSDCBalanceBefore;

    try {
      tokenManagerBalanceBefore = await depositManager.getTokenManagerUSDCBalance();
      console.log(
        "🏦 DepositManager USDC balance:",
        ethers.formatUnits(tokenManagerBalanceBefore, 6),
        "USDC"
      );
    } catch (error) {
      console.log("⚠️ Could not get DepositManager USDC balance:", error.message);
    }

    try {
      compoundBalanceBefore = await depositManager.getCompoundUSDCBalance();
      console.log(
        "🏦 Compound USDC balance:",
        ethers.formatUnits(compoundBalanceBefore, 6),
        "USDC"
      );
    } catch (error) {
      console.log("⚠️ Could not get Compound USDC balance:", error.message);
    }

    try {
      totalAvailableBalanceBefore = await depositManager.getTotalAvailableBalance();
      console.log(
        "🏦 Total available balance:",
        ethers.formatUnits(totalAvailableBalanceBefore, 6),
        "USDC"
      );
    } catch (error) {
      console.log("⚠️ Could not get total available balance:", error.message);
    }

    try {
      platformTokenSupplyBefore = await platformToken.totalSupply();
      console.log("🎯 Total CUT supply:", ethers.formatUnits(platformTokenSupplyBefore, 18), "CUT");
    } catch (error) {
      console.log("⚠️ Could not get total CUT supply:", error.message);
    }

    try {
      recipientUSDCBalanceBefore = await usdc.balanceOf(recipientAddress);
      console.log(
        "💳 Recipient USDC balance before:",
        ethers.formatUnits(recipientUSDCBalanceBefore, 6),
        "USDC"
      );
    } catch (error) {
      console.log("⚠️ Could not get recipient USDC balance:", error.message);
      recipientUSDCBalanceBefore = BigInt(0);
    }

    // Perform emergency withdrawal
    console.log("\n🚨 Executing emergency withdrawal...");
    console.log("📋 Withdrawal details:");
    console.log("  - Recipient:", recipientAddress);
    console.log("  - DepositManager address:", DEPOSIT_MANAGER_ADDRESS);

    const withdrawTx = await depositManager.emergencyWithdrawAll(recipientAddress, {
      gasLimit: 500000, // Set explicit gas limit to avoid estimation issues
    });
    console.log("📝 Emergency withdrawal transaction hash:", withdrawTx.hash);

    // Wait for transaction to be mined
    console.log("⏳ Waiting for transaction confirmation...");
    const withdrawReceipt = await withdrawTx.wait();
    console.log("✅ Withdrawal confirmed in block:", withdrawReceipt.blockNumber);
    console.log("⛽ Gas used:", withdrawReceipt.gasUsed.toString());

    // Get new balances and stats (with error handling)
    let tokenManagerBalanceAfter,
      compoundBalanceAfter,
      totalAvailableBalanceAfter,
      platformTokenSupplyAfter,
      recipientUSDCBalanceAfter;

    try {
      tokenManagerBalanceAfter = await depositManager.getTokenManagerUSDCBalance();
    } catch (error) {
      console.log("⚠️ Could not get DepositManager USDC balance after:", error.message);
      tokenManagerBalanceAfter = BigInt(0);
    }

    try {
      compoundBalanceAfter = await depositManager.getCompoundUSDCBalance();
    } catch (error) {
      console.log("⚠️ Could not get Compound USDC balance after:", error.message);
      compoundBalanceAfter = BigInt(0);
    }

    try {
      totalAvailableBalanceAfter = await depositManager.getTotalAvailableBalance();
    } catch (error) {
      console.log("⚠️ Could not get total available balance after:", error.message);
      totalAvailableBalanceAfter = BigInt(0);
    }

    try {
      platformTokenSupplyAfter = await platformToken.totalSupply();
    } catch (error) {
      console.log("⚠️ Could not get total CUT supply after:", error.message);
      platformTokenSupplyAfter = BigInt(0);
    }

    try {
      recipientUSDCBalanceAfter = await usdc.balanceOf(recipientAddress);
    } catch (error) {
      console.log("⚠️ Could not get recipient USDC balance after:", error.message);
      recipientUSDCBalanceAfter = BigInt(0);
    }

    // Calculate amount withdrawn
    const usdcWithdrawn = recipientUSDCBalanceAfter - recipientUSDCBalanceBefore;

    console.log("\n📈 Results:");
    console.log("💰 USDC withdrawn:", ethers.formatUnits(usdcWithdrawn, 6), "USDC");
    console.log(
      "💳 Recipient USDC balance after:",
      ethers.formatUnits(recipientUSDCBalanceAfter, 6),
      "USDC"
    );
    console.log(
      "🏦 DepositManager USDC balance after:",
      ethers.formatUnits(tokenManagerBalanceAfter, 6),
      "USDC"
    );
    console.log(
      "🏦 Compound USDC balance after:",
      ethers.formatUnits(compoundBalanceAfter, 6),
      "USDC"
    );
    console.log(
      "🏦 Total available balance after:",
      ethers.formatUnits(totalAvailableBalanceAfter, 6),
      "USDC"
    );
    console.log(
      "🎯 Total CUT supply after:",
      ethers.formatUnits(platformTokenSupplyAfter, 18),
      "CUT"
    );

    console.log(
      "\n🎉 Successfully performed emergency withdrawal of",
      ethers.formatUnits(usdcWithdrawn, 6),
      "USDC to",
      recipientAddress
    );
  } catch (error) {
    console.error("❌ Error performing emergency withdrawal:", error.message);

    // Try to decode custom errors if available
    if (error.data) {
      console.error("📋 Error data:", error.data);

      // Common custom error signatures
      const errorSignatures = {
        "0x1e4fbdf7": "OwnableUnauthorizedAccount",
        "0x4e487b71": "Panic error",
        "0x8baa579f": "InvalidRecipient",
      };

      const errorSignature = error.data.slice(0, 10);
      const knownError = errorSignatures[errorSignature];

      if (knownError) {
        console.error(`🔍 Detected error: ${knownError}`);
        if (knownError === "OwnableUnauthorizedAccount") {
          console.error(
            "⚠️ This function can only be called by the contract owner. Make sure you're using the owner's private key."
          );
        }
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
emergencyWithdrawAll().catch(console.error);
