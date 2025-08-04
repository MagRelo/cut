import { ethers } from "ethers";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

// Contract ABIs
const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

const TREASURY_ABI = [
  "function depositUSDC(uint256 amount) external",
  "function getExchangeRate() external view returns (uint256)",
  "function getTreasuryBalance() external view returns (uint256)",
];

const PLATFORM_TOKEN_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function symbol() external view returns (string)",
];

async function testTreasuryDepositSimple() {
  try {
    // Configuration
    let RPC_URL = process.env.RPC_URL || "https://mainnet.base.org";
    const PRIVATE_KEY = process.env.PRIVATE_KEY;

    // Force mainnet connection for mainnet addresses
    if (RPC_URL.includes("sepolia")) {
      console.log("⚠️  Warning: You're connecting to Sepolia testnet but using mainnet addresses.");
      console.log("   Switching to mainnet RPC URL: https://mainnet.base.org");
      RPC_URL = "https://mainnet.base.org";
    }

    if (!PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY environment variable is required");
    }

    // Contract addresses (Base Mainnet)
    const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC on Base Mainnet
    const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS;
    const PLATFORM_TOKEN_ADDRESS = "0x1699Eb97Dcf31B0ad2A964028e00C7CEB92B453B";

    if (!TREASURY_ADDRESS) {
      throw new Error("TREASURY_ADDRESS environment variable is required");
    }

    // Connect to network
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log("=== Simple Treasury Deposit Test ===");
    console.log("Network:", RPC_URL);
    console.log("Wallet:", wallet.address);
    console.log("Treasury:", TREASURY_ADDRESS);
    console.log("USDC:", USDC_ADDRESS);
    console.log("Platform Token:", PLATFORM_TOKEN_ADDRESS);

    // Create contract instances
    const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);
    const treasuryContract = new ethers.Contract(TREASURY_ADDRESS, TREASURY_ABI, wallet);
    const platformTokenContract = new ethers.Contract(
      PLATFORM_TOKEN_ADDRESS,
      PLATFORM_TOKEN_ABI,
      wallet
    );

    // Validate contracts exist and are accessible
    console.log("Validating contracts...");
    try {
      await usdcContract.balanceOf(wallet.address);
      console.log("✅ USDC contract is accessible");
    } catch (error) {
      console.error("❌ USDC contract error:", error.message);
      throw new Error(
        `USDC contract at ${USDC_ADDRESS} is not accessible. Please verify the address.`
      );
    }

    try {
      await treasuryContract.getExchangeRate();
      console.log("✅ Treasury contract is accessible");
    } catch (error) {
      console.error("❌ Treasury contract error:", error.message);
      throw new Error(
        `Treasury contract at ${TREASURY_ADDRESS} is not accessible. Please verify the address.`
      );
    }

    try {
      await platformTokenContract.balanceOf(wallet.address);
      console.log("✅ Platform Token contract is accessible");
    } catch (error) {
      console.error("❌ Platform Token contract error:", error.message);
      throw new Error(
        `Platform Token contract at ${PLATFORM_TOKEN_ADDRESS} is not accessible. Please verify the address.`
      );
    }

    // Check initial balances
    const initialEthBalance = await provider.getBalance(wallet.address);
    const initialUsdcBalance = await usdcContract.balanceOf(wallet.address);
    const initialPlatformTokenBalance = await platformTokenContract.balanceOf(wallet.address);

    console.log("\n=== Initial Balances ===");
    console.log("ETH:", ethers.formatEther(initialEthBalance));
    console.log("USDC:", ethers.formatUnits(initialUsdcBalance, 6));
    console.log("Platform Tokens:", ethers.formatEther(initialPlatformTokenBalance));

    // Check if user has USDC
    if (initialUsdcBalance === 0n) {
      console.log("\n❌ No USDC balance found. You need USDC to test the treasury deposit.");
      console.log("You can either:");
      console.log("1. Buy USDC manually and run this script again");
      console.log(
        "2. Use the full test script: test-treasury-deposit.js (which buys USDC with ETH)"
      );
      console.log("3. Use a faucet if on testnet");
      return;
    }

    // Use exactly 1 USDC for deposit
    const usdcAmountToDeposit = ethers.parseUnits("1", 6); // Use exactly 1 USDC
    console.log("Will deposit exactly 1 USDC");

    console.log("\n=== Step 1: Approving Treasury to spend USDC ===");
    console.log("USDC to deposit:", ethers.formatUnits(usdcAmountToDeposit, 6));

    const approveTx = await usdcContract.approve(TREASURY_ADDRESS, usdcAmountToDeposit);
    console.log("Approve transaction hash:", approveTx.hash);
    await approveTx.wait();
    console.log("Approval completed!");

    // Step 2: Deposit USDC into Treasury
    console.log("\n=== Step 2: Depositing USDC into Treasury ===");

    console.log("Depositing USDC amount:", ethers.formatUnits(usdcAmountToDeposit, 6));

    // Check allowance before deposit
    const allowance = await usdcContract.allowance(wallet.address, TREASURY_ADDRESS);
    console.log("USDC Allowance:", ethers.formatUnits(allowance, 6));
    console.log("USDC Amount to deposit:", ethers.formatUnits(usdcAmountToDeposit, 6));

    if (allowance < usdcAmountToDeposit) {
      throw new Error(
        `Insufficient allowance. Have: ${ethers.formatUnits(
          allowance,
          6
        )}, Need: ${ethers.formatUnits(usdcAmountToDeposit, 6)}`
      );
    }

    // Check Treasury state
    try {
      const exchangeRate = await treasuryContract.getExchangeRate();
      console.log("Current Exchange Rate:", ethers.formatEther(exchangeRate));
    } catch (error) {
      console.log("Could not get exchange rate:", error.message);
    }

    const depositTx = await treasuryContract.depositUSDC(usdcAmountToDeposit);
    console.log("Deposit transaction hash:", depositTx.hash);
    await depositTx.wait();
    console.log("Deposit completed!");

    // Step 3: Check final balances and exchange rate
    console.log("\n=== Step 3: Checking Results ===");

    const finalEthBalance = await provider.getBalance(wallet.address);
    const finalUsdcBalance = await usdcContract.balanceOf(wallet.address);
    const finalPlatformTokenBalance = await platformTokenContract.balanceOf(wallet.address);
    const exchangeRate = await treasuryContract.getExchangeRate();
    const treasuryBalance = await treasuryContract.getTreasuryBalance();

    console.log("Final ETH Balance:", ethers.formatEther(finalEthBalance));
    console.log("Final USDC Balance:", ethers.formatUnits(finalUsdcBalance, 6));
    console.log("Final Platform Token Balance:", ethers.formatEther(finalPlatformTokenBalance));
    console.log("Exchange Rate:", ethers.formatEther(exchangeRate));
    console.log("Treasury USDC Balance:", ethers.formatUnits(treasuryBalance, 6));

    // Calculate what was received
    const platformTokensReceived = finalPlatformTokenBalance - initialPlatformTokenBalance;
    const usdcDeposited = initialUsdcBalance - finalUsdcBalance;

    console.log("\n=== Summary ===");
    console.log("USDC Deposited:", ethers.formatUnits(usdcDeposited, 6));
    console.log("Platform Tokens Received:", ethers.formatEther(platformTokensReceived));
    console.log(
      "Effective Exchange Rate:",
      ethers.formatUnits(usdcDeposited, 6) +
        " USDC = " +
        ethers.formatEther(platformTokensReceived) +
        " CUT"
    );

    console.log("\n✅ Treasury deposit test completed successfully!");
  } catch (error) {
    console.error("❌ Error during treasury deposit test:", error);
    process.exit(1);
  }
}

// Run the test
testTreasuryDepositSimple().catch(console.error);
