import { ethers } from "ethers";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

async function testPlatformTokenTreasury() {
  try {
    // Configuration
    let RPC_URL = process.env.RPC_URL || "https://mainnet.base.org";
    const PRIVATE_KEY = process.env.PRIVATE_KEY;

    if (!PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY environment variable is required");
    }

    // Contract addresses
    const PLATFORM_TOKEN_ADDRESS = "0x1699Eb97Dcf31B0ad2A964028e00C7CEB92B453B";
    const NEW_TREASURY_ADDRESS = "0x9Ba098Bcd17b3474E6dA824A43704b8baA8cC3b5";
    const OLD_TREASURY_ADDRESS = "0x43A0688816A5C5Cb18f7050B942c14f154D13fC7";

    // Connect to network
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log("=== Testing Platform Token Treasury Setting ===");
    console.log("Network:", RPC_URL);
    console.log("Wallet:", wallet.address);
    console.log("Platform Token:", PLATFORM_TOKEN_ADDRESS);
    console.log("New Treasury:", NEW_TREASURY_ADDRESS);
    console.log("Old Treasury:", OLD_TREASURY_ADDRESS);

    // Create contract instance
    const platformTokenContract = new ethers.Contract(
      PLATFORM_TOKEN_ADDRESS,
      [
        "function treasury() external view returns (address)",
        "function setTreasury(address _treasury) external",
        "function owner() external view returns (address)",
        "function name() external view returns (string)",
        "function symbol() external view returns (string)",
        "function totalSupply() external view returns (uint256)",
      ],
      wallet
    );

    // Check Platform Token details
    console.log("\n=== Platform Token Details ===");
    try {
      const name = await platformTokenContract.name();
      const symbol = await platformTokenContract.symbol();
      const totalSupply = await platformTokenContract.totalSupply();
      const owner = await platformTokenContract.owner();

      console.log("Name:", name);
      console.log("Symbol:", symbol);
      console.log("Total Supply:", ethers.formatUnits(totalSupply, 18));
      console.log("Owner:", owner);
      console.log("Wallet:", wallet.address);

      if (owner.toLowerCase() === wallet.address.toLowerCase()) {
        console.log("✅ Wallet is the owner");
      } else {
        console.log("❌ Wallet is NOT the owner");
      }
    } catch (error) {
      console.error("❌ Error getting Platform Token details:", error.message);
    }

    // Check current treasury setting
    console.log("\n=== Current Treasury Setting ===");
    try {
      const currentTreasury = await platformTokenContract.treasury();
      console.log("Current Treasury:", currentTreasury);
      console.log("Expected Treasury:", NEW_TREASURY_ADDRESS);

      if (currentTreasury.toLowerCase() === NEW_TREASURY_ADDRESS.toLowerCase()) {
        console.log("✅ Treasury is correctly set to NEW Treasury!");
      } else if (currentTreasury.toLowerCase() === OLD_TREASURY_ADDRESS.toLowerCase()) {
        console.log("❌ Treasury is still set to OLD Treasury!");
      } else {
        console.log("❌ Treasury is set to UNKNOWN address!");
      }
    } catch (error) {
      console.error("❌ Error checking treasury:", error.message);
    }

    // Test if we can call treasury functions
    console.log("\n=== Testing Treasury Functions ===");
    try {
      const treasuryContract = new ethers.Contract(
        NEW_TREASURY_ADDRESS,
        [
          "function getExchangeRate() external view returns (uint256)",
          "function getTreasuryBalance() external view returns (uint256)",
          "function totalUSDCBalance() external view returns (uint256)",
          "function totalPlatformTokensMinted() external view returns (uint256)",
        ],
        wallet
      );

      const exchangeRate = await treasuryContract.getExchangeRate();
      const treasuryBalance = await treasuryContract.getTreasuryBalance();
      const totalUSDCBalance = await treasuryContract.totalUSDCBalance();
      const totalPlatformTokensMinted = await treasuryContract.totalPlatformTokensMinted();

      console.log("Exchange Rate:", ethers.formatUnits(exchangeRate, 18));
      console.log("Treasury Balance:", ethers.formatUnits(treasuryBalance, 6), "USDC");
      console.log("Total USDC Balance:", ethers.formatUnits(totalUSDCBalance, 6), "USDC");
      console.log(
        "Total Platform Tokens Minted:",
        ethers.formatUnits(totalPlatformTokensMinted, 18)
      );

      console.log("✅ Treasury functions are accessible!");
    } catch (error) {
      console.error("❌ Error calling Treasury functions:", error.message);
    }

    // Test a small deposit to verify everything works
    console.log("\n=== Testing Small Deposit ===");
    try {
      const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
      const usdcContract = new ethers.Contract(
        USDC_ADDRESS,
        [
          "function balanceOf(address account) external view returns (uint256)",
          "function approve(address spender, uint256 amount) external returns (bool)",
        ],
        wallet
      );

      const usdcBalance = await usdcContract.balanceOf(wallet.address);
      console.log("USDC Balance:", ethers.formatUnits(usdcBalance, 6));

      if (usdcBalance > ethers.parseUnits("0.01", 6)) {
        const testAmount = ethers.parseUnits("0.01", 6);
        console.log("Testing with 0.01 USDC...");

        // Approve
        const approveTx = await usdcContract.approve(NEW_TREASURY_ADDRESS, testAmount);
        await approveTx.wait();
        console.log("✅ Approval successful");

        // Deposit
        const depositTx = await treasuryContract.depositUSDC(testAmount);
        await depositTx.wait();
        console.log("✅ Deposit successful!");

        console.log("🎉 Platform Token and Treasury are working correctly together!");
      } else {
        console.log("⚠️  Insufficient USDC for test deposit");
      }
    } catch (error) {
      console.error("❌ Error during test deposit:", error.message);
    }
  } catch (error) {
    console.error("❌ Error during test:", error);
    process.exit(1);
  }
}

// Run the test
testPlatformTokenTreasury().catch(console.error);
