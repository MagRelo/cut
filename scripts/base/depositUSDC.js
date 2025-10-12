import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), "contracts", ".env") });

// DepositManager ABI - just the functions we need
const DEPOSIT_MANAGER_ABI = [
  "function depositUSDC(uint256 amount) external",
  "function getTokenManagerUSDCBalance() external view returns (uint256)",
  "function getCompoundUSDCBalance() external view returns (uint256)",
  "function getTotalAvailableBalance() external view returns (uint256)",
  "function isCompoundSupplyPaused() external view returns (bool)",
  "function isCompoundWithdrawPaused() external view returns (bool)",
];

// Real USDC ABI (Base network)
const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external pure returns (uint8)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
];

// PlatformToken (CUT) ABI
const PLATFORM_TOKEN_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external pure returns (uint8)",
  "function totalSupply() external view returns (uint256)",
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

async function depositUSDC() {
  // Get environment variables
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";
  const USE_LATEST_DEPLOYMENT = process.env.USE_LATEST_DEPLOYMENT === "true";

  // Deposit parameters
  const USDC_AMOUNT = process.env.USDC_AMOUNT || "1000000"; // 1 USDC (6 decimals)

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

  console.log("🔗 Connected to network:", await provider.getNetwork());
  console.log("👛 Wallet address:", wallet.address);
  console.log("💰 USDC amount to deposit:", ethers.formatUnits(USDC_AMOUNT, 6), "USDC");

  // Create contract instances
  const depositManager = new ethers.Contract(DEPOSIT_MANAGER_ADDRESS, DEPOSIT_MANAGER_ABI, wallet);
  const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);
  const platformToken = new ethers.Contract(PLATFORM_TOKEN_ADDRESS, PLATFORM_TOKEN_ABI, wallet);

  try {
    // Check USDC balance
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log("💳 Current USDC balance:", ethers.formatUnits(usdcBalance, 6), "USDC");

    if (usdcBalance < BigInt(USDC_AMOUNT)) {
      throw new Error(
        `Insufficient USDC balance. Need ${ethers.formatUnits(
          USDC_AMOUNT,
          6
        )} USDC, have ${ethers.formatUnits(
          usdcBalance,
          6
        )} USDC. Please acquire USDC from a DEX or bridge.`
      );
    }

    // Check current CUT balance
    const cutBalanceBefore = await platformToken.balanceOf(wallet.address);
    console.log("🎯 Current CUT balance:", ethers.formatUnits(cutBalanceBefore, 18), "CUT");

    // Check current allowance
    const currentAllowance = await usdc.allowance(wallet.address, DEPOSIT_MANAGER_ADDRESS);
    console.log("✅ Current allowance:", ethers.formatUnits(currentAllowance, 6), "USDC");

    // Approve USDC spending if needed
    if (currentAllowance < BigInt(USDC_AMOUNT)) {
      console.log("\n🔐 Approving USDC spending...");

      // Approve the exact amount needed for this transaction
      const approveTx = await usdc.approve(DEPOSIT_MANAGER_ADDRESS, USDC_AMOUNT);
      console.log("📝 Approval transaction hash:", approveTx.hash);

      const approveReceipt = await approveTx.wait();
      console.log("✅ Approval confirmed in block:", approveReceipt.blockNumber);

      // Verify the approval was successful
      const newAllowance = await usdc.allowance(wallet.address, DEPOSIT_MANAGER_ADDRESS);
      console.log("✅ New allowance:", ethers.formatUnits(newAllowance, 6), "USDC");

      if (newAllowance < BigInt(USDC_AMOUNT)) {
        throw new Error("Approval failed - insufficient allowance after approval");
      }
    } else {
      console.log("✅ Sufficient allowance already exists");
    }

    // Get DepositManager stats before deposit (skip problematic functions)
    let tokenManagerBalanceBefore,
      compoundBalanceBefore,
      totalAvailableBalanceBefore,
      platformTokenSupplyBefore;
    let isCompoundSupplyPaused, isCompoundWithdrawPaused;

    try {
      tokenManagerBalanceBefore = await depositManager.getTokenManagerUSDCBalance();
      console.log(
        "🏦 DepositManager USDC balance before:",
        ethers.formatUnits(tokenManagerBalanceBefore, 6),
        "USDC"
      );
    } catch (error) {
      console.log("⚠️ Could not get DepositManager USDC balance:", error.message);
    }

    try {
      compoundBalanceBefore = await depositManager.getCompoundUSDCBalance();
      console.log(
        "🏦 Compound USDC balance before:",
        ethers.formatUnits(compoundBalanceBefore, 6),
        "USDC"
      );
    } catch (error) {
      console.log("⚠️ Could not get Compound USDC balance:", error.message);
    }

    try {
      totalAvailableBalanceBefore = await depositManager.getTotalAvailableBalance();
      console.log(
        "🏦 Total available balance before:",
        ethers.formatUnits(totalAvailableBalanceBefore, 6),
        "USDC"
      );
    } catch (error) {
      console.log("⚠️ Could not get total available balance:", error.message);
    }

    try {
      platformTokenSupplyBefore = await platformToken.totalSupply();
      console.log(
        "🎯 Total CUT supply before:",
        ethers.formatUnits(platformTokenSupplyBefore, 18),
        "CUT"
      );
    } catch (error) {
      console.log("⚠️ Could not get total CUT supply:", error.message);
    }

    // Check Compound pause status
    try {
      isCompoundSupplyPaused = await depositManager.isCompoundSupplyPaused();
      isCompoundWithdrawPaused = await depositManager.isCompoundWithdrawPaused();
      console.log("⏸️ Compound supply paused:", isCompoundSupplyPaused);
      console.log("⏸️ Compound withdraw paused:", isCompoundWithdrawPaused);
    } catch (error) {
      console.log("⚠️ Could not get Compound pause status:", error.message);
    }

    // Deposit USDC
    console.log("\n💸 Depositing USDC...");
    console.log("📋 Deposit details:");
    console.log("  - Amount:", ethers.formatUnits(USDC_AMOUNT, 6), "USDC");
    console.log("  - DepositManager address:", DEPOSIT_MANAGER_ADDRESS);
    // Get current allowance with error handling
    let currentAllowanceValue;
    try {
      currentAllowanceValue = await usdc.allowance(wallet.address, DEPOSIT_MANAGER_ADDRESS);
      console.log("  - Current allowance:", ethers.formatUnits(currentAllowanceValue, 6), "USDC");
    } catch (error) {
      console.log("  - Could not get current allowance:", error.message);
      currentAllowanceValue = BigInt(0);
    }

    const depositTx = await depositManager.depositUSDC(USDC_AMOUNT, {
      gasLimit: 500000, // Set explicit gas limit to avoid estimation issues
    });
    console.log("📝 Deposit transaction hash:", depositTx.hash);

    // Wait for transaction to be mined
    console.log("⏳ Waiting for transaction confirmation...");
    const depositReceipt = await depositTx.wait();
    console.log("✅ Deposit confirmed in block:", depositReceipt.blockNumber);
    console.log("⛽ Gas used:", depositReceipt.gasUsed.toString());

    // Get new balances and stats (with error handling)
    let cutBalanceAfter,
      usdcBalanceAfter,
      tokenManagerBalanceAfter,
      compoundBalanceAfter,
      totalAvailableBalanceAfter,
      platformTokenSupplyAfter;

    try {
      cutBalanceAfter = await platformToken.balanceOf(wallet.address);
    } catch (error) {
      console.log("⚠️ Could not get CUT balance after:", error.message);
      cutBalanceAfter = cutBalanceBefore;
    }

    try {
      usdcBalanceAfter = await usdc.balanceOf(wallet.address);
    } catch (error) {
      console.log("⚠️ Could not get USDC balance after:", error.message);
      usdcBalanceAfter = BigInt(0);
    }

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

    // Calculate CUT received
    const cutReceived = cutBalanceAfter - cutBalanceBefore;

    console.log("\n📈 Results:");
    console.log("🎯 CUT received:", ethers.formatUnits(cutReceived, 18), "CUT");
    console.log("💳 New USDC balance:", ethers.formatUnits(usdcBalanceAfter, 6), "USDC");
    console.log("🎯 New CUT balance:", ethers.formatUnits(cutBalanceAfter, 18), "CUT");
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
      "\n🎉 Successfully deposited",
      ethers.formatUnits(USDC_AMOUNT, 6),
      "USDC and received",
      ethers.formatUnits(cutReceived, 18),
      "CUT tokens"
    );
  } catch (error) {
    console.error("❌ Error depositing USDC:", error.message);

    // Try to decode custom errors if available
    if (error.data) {
      console.error("📋 Error data:", error.data);

      // Common custom error signatures
      const errorSignatures = {
        "0xfb8f41b2": "ERC20InsufficientAllowance",
        "0x4d2301cc": "ERC20InsufficientBalance",
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
depositUSDC().catch(console.error);
