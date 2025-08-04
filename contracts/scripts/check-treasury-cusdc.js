import { ethers } from "ethers";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

async function checkTreasuryCUSDC() {
  try {
    // Configuration
    let RPC_URL = process.env.RPC_URL || "https://mainnet.base.org";
    const PRIVATE_KEY = process.env.PRIVATE_KEY;

    if (!PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY environment variable is required");
    }

    // Contract addresses
    const TREASURY_ADDRESS = "0x9Ba098Bcd17b3474E6dA824A43704b8baA8cC3b5";
    const CUSDC_ADDRESS = "0xb125E6687d4313864e53df431d5425969c15Eb2F";
    const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

    // Connect to network
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log("=== Checking Treasury cUSDC Balance ===");
    console.log("Network:", RPC_URL);
    console.log("Treasury:", TREASURY_ADDRESS);
    console.log("cUSDC:", CUSDC_ADDRESS);
    console.log("USDC:", USDC_ADDRESS);

    // Create contract instances
    const treasuryContract = new ethers.Contract(
      TREASURY_ADDRESS,
      [
        "function totalUSDCBalance() external view returns (uint256)",
        "function getCompoundYield() external view returns (uint256)",
        "function getTreasuryBalance() external view returns (uint256)",
        "function totalPlatformTokensMinted() external view returns (uint256)",
      ],
      wallet
    );

    const cusdcContract = new ethers.Contract(
      CUSDC_ADDRESS,
      [
        "function balanceOf(address owner) external view returns (uint256)",
        "function totalSupply() external view returns (uint256)",
        "function isSupplyPaused() external view returns (bool)",
      ],
      wallet
    );

    const usdcContract = new ethers.Contract(
      USDC_ADDRESS,
      ["function balanceOf(address account) external view returns (uint256)"],
      wallet
    );

    // Check Treasury balances
    console.log("\n=== Treasury Balances ===");
    try {
      const treasuryUSDCBalance = await treasuryContract.totalUSDCBalance();
      const treasuryCompoundYield = await treasuryContract.getCompoundYield();
      const treasuryTotalBalance = await treasuryContract.getTreasuryBalance();
      const totalPlatformTokensMinted = await treasuryContract.totalPlatformTokensMinted();

      console.log("Treasury USDC Balance:", ethers.formatUnits(treasuryUSDCBalance, 6), "USDC");
      console.log("Treasury Compound Yield:", ethers.formatUnits(treasuryCompoundYield, 6), "USDC");
      console.log("Treasury Total Balance:", ethers.formatUnits(treasuryTotalBalance, 6), "USDC");
      console.log(
        "Total Platform Tokens Minted:",
        ethers.formatUnits(totalPlatformTokensMinted, 18)
      );
    } catch (error) {
      console.error("❌ Error getting Treasury balances:", error.message);
    }

    // Check cUSDC balance of Treasury
    console.log("\n=== cUSDC Balance of Treasury ===");
    try {
      const treasuryCUSDCBalance = await cusdcContract.balanceOf(TREASURY_ADDRESS);
      const cUSDCTotalSupply = await cusdcContract.totalSupply();
      const isSupplyPaused = await cusdcContract.isSupplyPaused();

      console.log(
        "Treasury cUSDC Balance:",
        ethers.formatUnits(treasuryCUSDCBalance, 6),
        "USDC equivalent"
      );
      console.log(
        "cUSDC Total Supply:",
        ethers.formatUnits(cUSDCTotalSupply, 6),
        "USDC equivalent"
      );
      console.log("cUSDC Supply Paused:", isSupplyPaused);

      if (treasuryCUSDCBalance > 0) {
        console.log("✅ Treasury has cUSDC balance!");
      } else {
        console.log("⚠️  Treasury has no cUSDC balance");
      }
    } catch (error) {
      console.error("❌ Error getting cUSDC balance:", error.message);
    }

    // Check USDC balance of Treasury
    console.log("\n=== USDC Balance of Treasury ===");
    try {
      const treasuryUSDCBalanceDirect = await usdcContract.balanceOf(TREASURY_ADDRESS);
      console.log(
        "Treasury USDC Balance (direct):",
        ethers.formatUnits(treasuryUSDCBalanceDirect, 6),
        "USDC"
      );

      if (treasuryUSDCBalanceDirect > 0) {
        console.log("✅ Treasury has USDC balance!");
      } else {
        console.log("⚠️  Treasury has no USDC balance");
      }
    } catch (error) {
      console.error("❌ Error getting USDC balance:", error.message);
    }

    // Calculate total value
    console.log("\n=== Total Treasury Value ===");
    try {
      const treasuryUSDCBalanceDirect = await usdcContract.balanceOf(TREASURY_ADDRESS);
      const treasuryCUSDCBalance = await cusdcContract.balanceOf(TREASURY_ADDRESS);

      const totalValue = treasuryUSDCBalanceDirect + treasuryCUSDCBalance;
      console.log("USDC in Treasury:", ethers.formatUnits(treasuryUSDCBalanceDirect, 6), "USDC");
      console.log("USDC in cUSDC:", ethers.formatUnits(treasuryCUSDCBalance, 6), "USDC");
      console.log("Total Value:", ethers.formatUnits(totalValue, 6), "USDC");

      if (totalValue > 0) {
        console.log("✅ Treasury has total value!");
      } else {
        console.log("⚠️  Treasury has no value");
      }
    } catch (error) {
      console.error("❌ Error calculating total value:", error.message);
    }
  } catch (error) {
    console.error("❌ Error during check:", error);
    process.exit(1);
  }
}

// Run the check
checkTreasuryCUSDC().catch(console.error);
