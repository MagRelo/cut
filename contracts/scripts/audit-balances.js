import { ethers } from "ethers";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

async function auditBalances() {
  try {
    // Configuration
    let RPC_URL = process.env.RPC_URL || "https://mainnet.base.org";
    const PRIVATE_KEY = process.env.PRIVATE_KEY;

    if (!PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY environment variable is required");
    }

    // Contract addresses
    const TREASURY_ADDRESS = "0x9Ba098Bcd17b3474E6dA824A43704b8baA8cC3b5";
    const PLATFORM_TOKEN_ADDRESS = "0x1699Eb97Dcf31B0ad2A964028e00C7CEB92B453B";
    const CUSDC_ADDRESS = "0xb125E6687d4313864e53df431d5425969c15Eb2F";
    const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

    // Connect to network
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log("=== System Balance Audit ===");
    console.log("Network:", RPC_URL);
    console.log("Treasury:", TREASURY_ADDRESS);
    console.log("Platform Token:", PLATFORM_TOKEN_ADDRESS);
    console.log("cUSDC:", CUSDC_ADDRESS);
    console.log("USDC:", USDC_ADDRESS);

    // Create contract instances using exact same approach as working script
    const platformTokenContract = new ethers.Contract(
      PLATFORM_TOKEN_ADDRESS,
      [
        "function totalSupply() external view returns (uint256)",
        "function name() external view returns (string)",
        "function symbol() external view returns (string)",
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

    // 1. Platform Token Supply
    console.log("\n=== 1. Platform Token Supply ===");
    try {
      const platformTokenTotalSupply = await platformTokenContract.totalSupply();
      const platformTokenName = await platformTokenContract.name();
      const platformTokenSymbol = await platformTokenContract.symbol();

      console.log("Platform Token Name:", platformTokenName);
      console.log("Platform Token Symbol:", platformTokenSymbol);
      console.log(
        "Total Platform Token Supply:",
        ethers.formatUnits(platformTokenTotalSupply, 18),
        "CUT"
      );
    } catch (error) {
      console.error("❌ Error getting Platform Token supply:", error.message);
      return;
    }

    // 2. cUSDC Balance (using exact same approach as working script)
    console.log("\n=== 2. cUSDC Balance ===");
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
      return;
    }

    // 3. USDC Balance
    console.log("\n=== 3. USDC Balance ===");
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

    // 4. Balance Reconciliation
    console.log("\n=== 4. Balance Reconciliation ===");
    try {
      const platformTokenTotalSupply = await platformTokenContract.totalSupply();
      const treasuryCUSDCBalance = await cusdcContract.balanceOf(TREASURY_ADDRESS);
      const treasuryUSDCBalanceDirect = await usdcContract.balanceOf(TREASURY_ADDRESS);

      // Convert platform token supply from 18 decimals to 6 decimals (USDC equivalent)
      const platformTokenSupplyUSDC = platformTokenTotalSupply / 10 ** 12; // 18 - 6 = 12

      // Calculate total Treasury value (USDC + cUSDC)
      const totalTreasuryValue = treasuryUSDCBalanceDirect + treasuryCUSDCBalance;

      console.log(
        "Platform Token Supply (USDC equivalent):",
        ethers.formatUnits(platformTokenSupplyUSDC, 6),
        "USDC"
      );
      console.log("Treasury cUSDC Balance:", ethers.formatUnits(treasuryCUSDCBalance, 6), "USDC");
      console.log(
        "Treasury USDC Balance:",
        ethers.formatUnits(treasuryUSDCBalanceDirect, 6),
        "USDC"
      );
      console.log("Total Treasury Value:", ethers.formatUnits(totalTreasuryValue, 6), "USDC");

      // Check if they match (within 0.001 USDC tolerance for gas fees)
      const difference = Math.abs(platformTokenSupplyUSDC - totalTreasuryValue);
      const tolerance = ethers.parseUnits("0.001", 6);

      console.log("\n--- Balance Reconciliation ---");
      console.log("Difference:", ethers.formatUnits(difference, 6), "USDC");
      console.log("Tolerance:", ethers.formatUnits(tolerance, 6), "USDC");

      if (difference <= tolerance) {
        console.log("✅ System balances are reconciled!");
        console.log("✅ Platform Token supply matches Treasury value!");
      } else {
        console.log("❌ System balances are NOT reconciled!");
        console.log("❌ Platform Token supply does NOT match Treasury value!");

        // Calculate percentage difference
        const percentageDiff = (difference / platformTokenSupplyUSDC) * 100;
        console.log(`Percentage difference: ${percentageDiff.toFixed(2)}%`);
      }
    } catch (error) {
      console.error("❌ Error during balance reconciliation:", error.message);
    }

    // 5. Summary
    console.log("\n=== 5. Audit Summary ===");
    try {
      const platformTokenTotalSupply = await platformTokenContract.totalSupply();
      const treasuryCUSDCBalance = await cusdcContract.balanceOf(TREASURY_ADDRESS);
      const treasuryUSDCBalanceDirect = await usdcContract.balanceOf(TREASURY_ADDRESS);

      console.log("📊 System Overview:");
      console.log(
        `  • Platform Tokens Minted: ${ethers.formatUnits(platformTokenTotalSupply, 18)} CUT`
      );
      console.log(
        `  • Treasury cUSDC Balance: ${ethers.formatUnits(treasuryCUSDCBalance, 6)} USDC`
      );
      console.log(
        `  • Treasury USDC Balance: ${ethers.formatUnits(treasuryUSDCBalanceDirect, 6)} USDC`
      );

      const totalTreasuryValue = treasuryUSDCBalanceDirect + treasuryCUSDCBalance;
      const platformTokenSupplyUSDC = platformTokenTotalSupply / 10 ** 12;

      if (Math.abs(platformTokenSupplyUSDC - totalTreasuryValue) <= ethers.parseUnits("0.001", 6)) {
        console.log("✅ System is healthy and balanced!");
        console.log("✅ Platform Token supply equals Treasury value!");
      } else {
        console.log("❌ System has balance discrepancies!");
        const difference = Math.abs(platformTokenSupplyUSDC - totalTreasuryValue);
        console.log(`❌ Difference: ${ethers.formatUnits(difference, 6)} USDC`);
      }
    } catch (error) {
      console.error("❌ Error generating summary:", error.message);
    }
  } catch (error) {
    console.error("❌ Error during audit:", error);
    process.exit(1);
  }
}

// Run the audit
auditBalances().catch(console.error);
