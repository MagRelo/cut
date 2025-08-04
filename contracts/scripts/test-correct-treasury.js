import { ethers } from "ethers";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

async function testCorrectTreasury() {
  try {
    // Configuration
    let RPC_URL = process.env.RPC_URL || "https://mainnet.base.org";
    const PRIVATE_KEY = process.env.PRIVATE_KEY;

    if (!PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY environment variable is required");
    }

    // Contract addresses
    const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    const TREASURY_ADDRESS = "0x9Ba098Bcd17b3474E6dA824A43704b8baA8cC3b5"; // New Treasury
    const PLATFORM_TOKEN_ADDRESS = "0x1699Eb97Dcf31B0ad2A964028e00C7CEB92B453B";

    // Connect to network
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log("=== Testing Correct Treasury ===");
    console.log("Network:", RPC_URL);
    console.log("Wallet:", wallet.address);
    console.log("Treasury:", TREASURY_ADDRESS);

    // Create contract instances
    const usdcContract = new ethers.Contract(
      USDC_ADDRESS,
      [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function balanceOf(address account) external view returns (uint256)",
        "function allowance(address owner, address spender) external view returns (uint256)",
      ],
      wallet
    );

    const treasuryContract = new ethers.Contract(
      TREASURY_ADDRESS,
      [
        "function depositUSDC(uint256 amount) external",
        "function getExchangeRate() external view returns (uint256)",
        "function getTreasuryBalance() external view returns (uint256)",
      ],
      wallet
    );

    const platformTokenContract = new ethers.Contract(
      PLATFORM_TOKEN_ADDRESS,
      [
        "function treasury() external view returns (address)",
        "function balanceOf(address account) external view returns (uint256)",
        "function symbol() external view returns (string)",
      ],
      wallet
    );

    // Check balances
    console.log("\n=== Initial Balances ===");
    const ethBalance = await provider.getBalance(wallet.address);
    const usdcBalance = await usdcContract.balanceOf(wallet.address);
    const platformTokenBalance = await platformTokenContract.balanceOf(wallet.address);

    console.log("ETH:", ethers.formatEther(ethBalance));
    console.log("USDC:", ethers.formatUnits(usdcBalance, 6));
    console.log("Platform Tokens:", ethers.formatUnits(platformTokenBalance, 18));

    // Check Treasury setup
    console.log("\n=== Treasury Setup ===");
    try {
      const treasuryInPlatformToken = await platformTokenContract.treasury();
      console.log("Treasury in PlatformToken:", treasuryInPlatformToken);
      console.log("Expected Treasury:", TREASURY_ADDRESS);

      if (treasuryInPlatformToken.toLowerCase() === TREASURY_ADDRESS.toLowerCase()) {
        console.log("✅ Treasury is correctly set!");
      } else {
        console.log("❌ Treasury mismatch!");
        return;
      }
    } catch (error) {
      console.error("❌ Error checking treasury:", error.message);
      return;
    }

    // Test deposit with minimal amount
    const usdcAmountToDeposit = ethers.parseUnits("0.1", 6); // 0.1 USDC
    console.log("\n=== Testing Treasury Deposit ===");
    console.log("Amount to deposit:", ethers.formatUnits(usdcAmountToDeposit, 6), "USDC");

    if (usdcBalance < usdcAmountToDeposit) {
      console.log("❌ Insufficient USDC balance");
      return;
    }

    try {
      // Step 1: Approve Treasury to spend USDC
      console.log("Step 1: Approving Treasury...");
      const approveTx = await usdcContract.approve(TREASURY_ADDRESS, usdcAmountToDeposit);
      console.log("Approve transaction hash:", approveTx.hash);
      await approveTx.wait();
      console.log("✅ Approval successful");

      // Step 2: Check allowance
      const allowance = await usdcContract.allowance(wallet.address, TREASURY_ADDRESS);
      console.log("USDC Allowance:", ethers.formatUnits(allowance, 6));

      // Step 3: Try deposit
      console.log("Step 2: Depositing USDC...");
      const depositTx = await treasuryContract.depositUSDC(usdcAmountToDeposit, {
        gasLimit: 500000,
      });
      console.log("Deposit transaction hash:", depositTx.hash);
      await depositTx.wait();
      console.log("✅ Treasury deposit successful!");

      // Check final balances
      console.log("\n=== Final Balances ===");
      const finalUsdcBalance = await usdcContract.balanceOf(wallet.address);
      const finalPlatformTokenBalance = await platformTokenContract.balanceOf(wallet.address);

      console.log("USDC:", ethers.formatUnits(finalUsdcBalance, 6));
      console.log("Platform Tokens:", ethers.formatUnits(finalPlatformTokenBalance, 18));

      const usdcDiff = usdcBalance - finalUsdcBalance;
      const platformTokenDiff = finalPlatformTokenBalance - platformTokenBalance;

      console.log("USDC spent:", ethers.formatUnits(usdcDiff, 6));
      console.log("Platform Tokens received:", ethers.formatUnits(platformTokenDiff, 18));

      console.log("\n🎉 SUCCESS! USDC to Platform Token conversion is working!");
    } catch (error) {
      console.error("❌ Error during deposit:", error.message);
      console.error("Full error:", error);

      if (error.data) {
        console.error("Error data:", error.data);
      }
      if (error.reason) {
        console.error("Error reason:", error.reason);
      }
    }
  } catch (error) {
    console.error("❌ Error during test:", error);
    process.exit(1);
  }
}

// Run the test
testCorrectTreasury().catch(console.error);
