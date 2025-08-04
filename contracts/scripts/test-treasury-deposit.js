import { ethers } from "ethers";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";

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

// Uniswap V3 Router ABI (simplified for swapExactETHForTokens)
const UNISWAP_ROUTER_ABI = [
  "function swapExactETHForTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external payable returns (uint256[] memory amounts)",
];

async function testTreasuryDeposit() {
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
    const UNISWAP_ROUTER_ADDRESS = "0x2626664c2603336E57B271c5C0b26F421741e481"; // BaseSwap Router on Base Mainnet

    // Alternative DEX addresses for Base mainnet
    const ALIENBASE_ROUTER = "0x327Df1E6de05895d2ab08513aaDD9313Fe505d86"; // AlienBase Router
    const AERODROME_ROUTER = "0x420DD381b31aEf6683db6B902084cB0FFECe40Da"; // Aerodrome Router

    if (!TREASURY_ADDRESS) {
      throw new Error("TREASURY_ADDRESS environment variable is required");
    }

    // Connect to network
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log("=== Treasury Deposit Test ===");
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
    const uniswapRouter = new ethers.Contract(UNISWAP_ROUTER_ADDRESS, UNISWAP_ROUTER_ABI, wallet);
    const alienbaseRouter = new ethers.Contract(ALIENBASE_ROUTER, UNISWAP_ROUTER_ABI, wallet);

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

    // Step 1: Buy USDC with ETH using DEX
    console.log("\n=== Step 1: Buying USDC with ETH ===");

    const ethAmountToSwap = ethers.parseEther("0.002"); // 0.002 ETH
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now

    // Path for ETH -> USDC swap
    const path = [
      "0x4200000000000000000000000000000000000006", // WETH on Base
      USDC_ADDRESS,
    ];

    // More conservative estimate and higher slippage tolerance
    const estimatedUsdcOutput = ethers.parseUnits("3", 6); // 3 USDC estimate for 0.002 ETH
    const minUsdcOutput = (estimatedUsdcOutput * 95n) / 100n; // 5% slippage tolerance

    console.log("Swapping ETH for USDC...");
    console.log("ETH Amount:", ethers.formatEther(ethAmountToSwap));
    console.log("Minimum USDC Output:", ethers.formatUnits(minUsdcOutput, 6));

    // Try BaseSwap first, then AlienBase if it fails
    let swapTx;
    try {
      console.log("Trying BaseSwap...");
      swapTx = await uniswapRouter.swapExactETHForTokens(
        minUsdcOutput,
        path,
        wallet.address,
        deadline,
        { value: ethAmountToSwap }
      );
      console.log("BaseSwap transaction hash:", swapTx.hash);
    } catch (error) {
      console.log("BaseSwap failed, trying AlienBase...");
      try {
        swapTx = await alienbaseRouter.swapExactETHForTokens(
          minUsdcOutput,
          path,
          wallet.address,
          deadline,
          { value: ethAmountToSwap }
        );
        console.log("AlienBase transaction hash:", swapTx.hash);
      } catch (error2) {
        console.error("Both DEXes failed:");
        console.error("BaseSwap error:", error.message);
        console.error("AlienBase error:", error2.message);
        throw new Error(
          "Failed to swap ETH for USDC on both DEXes. You may need to manually swap ETH for USDC."
        );
      }
    }

    await swapTx.wait();
    console.log("Swap completed!");

    // Check USDC balance after swap
    const usdcBalanceAfterSwap = await usdcContract.balanceOf(wallet.address);
    console.log("USDC after swap:", ethers.formatUnits(usdcBalanceAfterSwap, 6));

    // Step 2: Approve Treasury to spend USDC
    console.log("\n=== Step 2: Approving Treasury to spend USDC ===");

    const usdcAmountToDeposit = usdcBalanceAfterSwap; // Deposit all USDC
    const approveTx = await usdcContract.approve(TREASURY_ADDRESS, usdcAmountToDeposit);
    console.log("Approve transaction hash:", approveTx.hash);
    await approveTx.wait();
    console.log("Approval completed!");

    // Step 3: Deposit USDC into Treasury
    console.log("\n=== Step 3: Depositing USDC into Treasury ===");

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

    // Step 4: Check final balances and exchange rate
    console.log("\n=== Step 4: Checking Results ===");

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
testTreasuryDeposit().catch(console.error);
