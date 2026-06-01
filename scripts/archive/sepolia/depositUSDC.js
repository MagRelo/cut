import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), "contracts", ".env") });

// DepositManager ABI - just the functions we need (yieldToken / Aave v3)
const DEPOSIT_MANAGER_ABI = [
  "function depositUSDC(uint256 amount) external",
  "function getTokenManagerUSDCBalance() external view returns (uint256)",
  "function getAaveUSDCBalance() external view returns (uint256)",
  "function getTotalAvailableBalance() external view returns (uint256)",
  "function isAaveSupplyPaused() external view returns (bool)",
  "function isAaveWithdrawPaused() external view returns (bool)",
];

// PaymentToken (USDC) ABI
const PAYMENT_TOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external pure returns (uint8)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function mint(address to, uint256 amount) external",
  "function owner() external view returns (address)",
];

// PlatformToken (CUT) ABI
const PLATFORM_TOKEN_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external pure returns (uint8)",
  "function totalSupply() external view returns (uint256)",
];

async function mintUSDCIfNeeded(paymentToken, wallet, requiredAmount) {
  const currentBalance = await paymentToken.balanceOf(wallet.address);

  if (currentBalance < BigInt(requiredAmount)) {
    console.log("🪙 Insufficient USDC balance, checking if we can mint (MockUSDC owner)...");
    console.log("  - Current balance:", ethers.formatUnits(currentBalance, 6), "USDC");
    console.log("  - Required amount:", ethers.formatUnits(requiredAmount, 6), "USDC");

    try {
      const owner = await paymentToken.owner();
      if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
        throw new Error(
          `Cannot mint USDC. Only the owner (${owner}) can mint. Current wallet: ${wallet.address}`
        );
      }
    } catch (error) {
      if (error.message?.includes("Only the owner")) throw error;
      console.error("❌ Error checking PaymentToken ownership:", error.message);
      throw new Error(`Cannot mint USDC: ${error.message}`);
    }

    const amountToMint = BigInt(requiredAmount) - currentBalance;
    console.log("  - Amount to mint:", ethers.formatUnits(amountToMint, 6), "USDC");

    try {
      const mintTx = await paymentToken.mint(wallet.address, amountToMint);
      console.log("📝 Mint transaction hash:", mintTx.hash);

      const mintReceipt = await mintTx.wait();
      console.log("✅ Mint confirmed in block:", mintReceipt.blockNumber);

      const newBalance = await paymentToken.balanceOf(wallet.address);
      console.log("✅ New USDC balance:", ethers.formatUnits(newBalance, 6), "USDC");

      return true;
    } catch (error) {
      console.error("❌ Error minting USDC:", error.message);
      throw new Error(`Failed to mint USDC: ${error.message}`);
    }
  }

  console.log("✅ Sufficient USDC balance exists");
  return false;
}

function loadSepoliaAddressesFromConfig() {
  const configPath = path.join(process.cwd(), "server", "src", "contracts", "sepolia.json");
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing ${configPath}. Run deploy or copy contract addresses.`);
  }
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

async function getLatestDeployment() {
  const config = loadSepoliaAddressesFromConfig();

  const broadcastDir = path.join(process.cwd(), "contracts", "broadcast", "Deploy_sepolia.s.sol");

  if (!fs.existsSync(broadcastDir)) {
    throw new Error(
      "Deployment broadcast directory not found. Please run the deployment script first."
    );
  }

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

  return {
    depositManager: depositManagerDeployment.contractAddress,
    paymentToken: config.paymentTokenAddress,
    platformToken: platformTokenDeployment.contractAddress,
  };
}

async function depositUSDC() {
  // Get environment variables
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
  const USE_LATEST_DEPLOYMENT = process.env.USE_LATEST_DEPLOYMENT === "true";

  // Deposit parameters
  const USDC_AMOUNT = process.env.USDC_AMOUNT || "1000000"; // 1 USDC (6 decimals)

  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  let DEPOSIT_MANAGER_ADDRESS, PAYMENT_TOKEN_ADDRESS, PLATFORM_TOKEN_ADDRESS;

  if (USE_LATEST_DEPLOYMENT) {
    try {
      const addresses = await getLatestDeployment();
      DEPOSIT_MANAGER_ADDRESS = addresses.depositManager;
      PAYMENT_TOKEN_ADDRESS = addresses.paymentToken;
      PLATFORM_TOKEN_ADDRESS = addresses.platformToken;
      console.log("📋 Using addresses from latest deployment:");
      console.log("  DepositManager:", DEPOSIT_MANAGER_ADDRESS);
      console.log("  PaymentToken:", PAYMENT_TOKEN_ADDRESS);
      console.log("  PlatformToken:", PLATFORM_TOKEN_ADDRESS);
    } catch (error) {
      console.error("Failed to get latest deployment:", error.message);
      console.log("Falling back to environment variables");
      DEPOSIT_MANAGER_ADDRESS = process.env.DEPOSIT_MANAGER_ADDRESS;
      PAYMENT_TOKEN_ADDRESS = process.env.PAYMENT_TOKEN_ADDRESS;
      PLATFORM_TOKEN_ADDRESS = process.env.PLATFORM_TOKEN_ADDRESS;
    }
  } else {
    DEPOSIT_MANAGER_ADDRESS = process.env.DEPOSIT_MANAGER_ADDRESS;
    PAYMENT_TOKEN_ADDRESS = process.env.PAYMENT_TOKEN_ADDRESS;
    PLATFORM_TOKEN_ADDRESS = process.env.PLATFORM_TOKEN_ADDRESS;
  }

  if (!DEPOSIT_MANAGER_ADDRESS || !PAYMENT_TOKEN_ADDRESS || !PLATFORM_TOKEN_ADDRESS) {
    throw new Error(
      "DEPOSIT_MANAGER_ADDRESS, PAYMENT_TOKEN_ADDRESS, and PLATFORM_TOKEN_ADDRESS environment variables are required when not using latest deployment"
    );
  }

  // Validate contract addresses
  if (!ethers.isAddress(DEPOSIT_MANAGER_ADDRESS)) {
    throw new Error("Invalid DEPOSIT_MANAGER_ADDRESS");
  }
  if (!ethers.isAddress(PAYMENT_TOKEN_ADDRESS)) {
    throw new Error("Invalid PAYMENT_TOKEN_ADDRESS");
  }
  if (!ethers.isAddress(PLATFORM_TOKEN_ADDRESS)) {
    throw new Error("Invalid PLATFORM_TOKEN_ADDRESS");
  }

  // Connect to the network
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("🔗 Connected to network:", await provider.getNetwork());
  console.log("👛 Wallet address:", wallet.address);
  console.log("💰 USDC amount to deposit:", ethers.formatUnits(USDC_AMOUNT, 6), "USDC");

  // Create contract instances
  const depositManager = new ethers.Contract(DEPOSIT_MANAGER_ADDRESS, DEPOSIT_MANAGER_ABI, wallet);
  const paymentToken = new ethers.Contract(PAYMENT_TOKEN_ADDRESS, PAYMENT_TOKEN_ABI, wallet);
  const platformToken = new ethers.Contract(PLATFORM_TOKEN_ADDRESS, PLATFORM_TOKEN_ABI, wallet);

  try {
    // Mint USDC if needed
    await mintUSDCIfNeeded(paymentToken, wallet, USDC_AMOUNT);

    // Check USDC balance
    const usdcBalance = await paymentToken.balanceOf(wallet.address);
    console.log("💳 Current USDC balance:", ethers.formatUnits(usdcBalance, 6), "USDC");

    if (usdcBalance < BigInt(USDC_AMOUNT)) {
      throw new Error(
        `Insufficient USDC balance. Need ${ethers.formatUnits(
          USDC_AMOUNT,
          6
        )} USDC, have ${ethers.formatUnits(usdcBalance, 6)} USDC`
      );
    }

    // Check current CUT balance
    const cutBalanceBefore = await platformToken.balanceOf(wallet.address);
    console.log("🎯 Current CUT balance:", ethers.formatUnits(cutBalanceBefore, 18), "CUT");

    // Check current allowance
    const currentAllowance = await paymentToken.allowance(wallet.address, DEPOSIT_MANAGER_ADDRESS);
    console.log("✅ Current allowance:", ethers.formatUnits(currentAllowance, 6), "USDC");

    // Approve USDC spending if needed
    if (currentAllowance < BigInt(USDC_AMOUNT)) {
      console.log("\n🔐 Approving USDC spending...");

      // Approve the exact amount needed for this transaction
      const approveTx = await paymentToken.approve(DEPOSIT_MANAGER_ADDRESS, USDC_AMOUNT);
      console.log("📝 Approval transaction hash:", approveTx.hash);

      const approveReceipt = await approveTx.wait();
      console.log("✅ Approval confirmed in block:", approveReceipt.blockNumber);

      // Verify the approval was successful
      const newAllowance = await paymentToken.allowance(wallet.address, DEPOSIT_MANAGER_ADDRESS);
      console.log("✅ New allowance:", ethers.formatUnits(newAllowance, 6), "USDC");

      if (newAllowance < BigInt(USDC_AMOUNT)) {
        throw new Error("Approval failed - insufficient allowance after approval");
      }
    } else {
      console.log("✅ Sufficient allowance already exists");
    }

    // Get DepositManager stats before deposit
    const tokenManagerBalanceBefore = await depositManager.getTokenManagerUSDCBalance();
    const aaveBalanceBefore = await depositManager.getAaveUSDCBalance();
    const totalAvailableBalanceBefore = await depositManager.getTotalAvailableBalance();
    const platformTokenSupplyBefore = await platformToken.totalSupply();
    console.log(
      "🏦 DepositManager USDC balance before:",
      ethers.formatUnits(tokenManagerBalanceBefore, 6),
      "USDC"
    );
    console.log(
      "🏦 Aave USDC balance before:",
      ethers.formatUnits(aaveBalanceBefore, 6),
      "USDC"
    );
    console.log(
      "🏦 Total available balance before:",
      ethers.formatUnits(totalAvailableBalanceBefore, 6),
      "USDC"
    );
    console.log(
      "🎯 Total CUT supply before:",
      ethers.formatUnits(platformTokenSupplyBefore, 18),
      "CUT"
    );

    const isAaveSupplyPaused = await depositManager.isAaveSupplyPaused();
    const isAaveWithdrawPaused = await depositManager.isAaveWithdrawPaused();
    console.log("⏸️ Aave supply paused:", isAaveSupplyPaused);
    console.log("⏸️ Aave withdraw paused:", isAaveWithdrawPaused);

    // Deposit USDC
    console.log("\n💸 Depositing USDC...");
    console.log("📋 Deposit details:");
    console.log("  - Amount:", ethers.formatUnits(USDC_AMOUNT, 6), "USDC");
    console.log("  - DepositManager address:", DEPOSIT_MANAGER_ADDRESS);
    console.log(
      "  - Current allowance:",
      ethers.formatUnits(await paymentToken.allowance(wallet.address, DEPOSIT_MANAGER_ADDRESS), 6),
      "USDC"
    );

    const depositTx = await depositManager.depositUSDC(USDC_AMOUNT);
    console.log("📝 Deposit transaction hash:", depositTx.hash);

    // Wait for transaction to be mined
    console.log("⏳ Waiting for transaction confirmation...");
    const depositReceipt = await depositTx.wait();
    console.log("✅ Deposit confirmed in block:", depositReceipt.blockNumber);
    console.log("⛽ Gas used:", depositReceipt.gasUsed.toString());

    // Get new balances and stats
    const cutBalanceAfter = await platformToken.balanceOf(wallet.address);
    const usdcBalanceAfter = await paymentToken.balanceOf(wallet.address);
    const tokenManagerBalanceAfter = await depositManager.getTokenManagerUSDCBalance();
    const aaveBalanceAfter = await depositManager.getAaveUSDCBalance();
    const totalAvailableBalanceAfter = await depositManager.getTotalAvailableBalance();
    const platformTokenSupplyAfter = await platformToken.totalSupply();

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
      "🏦 Aave USDC balance after:",
      ethers.formatUnits(aaveBalanceAfter, 6),
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
