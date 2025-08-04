import { ethers } from "ethers";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

async function auditSystemBalances() {
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
    const ESCROW_FACTORY_ADDRESS = "0xEcDdA95223eA4E7813130fFBcd4B24f362ac4553";

    // Connect to network
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log("=== System Balance Audit ===");
    console.log("Network:", RPC_URL);
    console.log("Wallet:", wallet.address);
    console.log("Treasury:", TREASURY_ADDRESS);
    console.log("Platform Token:", PLATFORM_TOKEN_ADDRESS);
    console.log("cUSDC:", CUSDC_ADDRESS);
    console.log("USDC:", USDC_ADDRESS);
    console.log("EscrowFactory:", ESCROW_FACTORY_ADDRESS);

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

    const platformTokenContract = new ethers.Contract(
      PLATFORM_TOKEN_ADDRESS,
      [
        "function totalSupply() external view returns (uint256)",
        "function balanceOf(address account) external view returns (uint256)",
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
      [
        "function balanceOf(address account) external view returns (uint256)",
        "function totalSupply() external view returns (uint256)",
      ],
      wallet
    );

    const escrowFactoryContract = new ethers.Contract(
      ESCROW_FACTORY_ADDRESS,
      ["function getEscrows() external view returns (address[])"],
      wallet
    );

    // 1. Platform Token Supply
    console.log("\n=== 1. Platform Token Supply ===");
    try {
      const platformTokenTotalSupply = await platformTokenContract.totalSupply();
      const platformTokenName = await platformTokenContract.name();
      const platformTokenSymbol = await platformTokenContract.symbol();
      const walletPlatformTokenBalance = await platformTokenContract.balanceOf(wallet.address);

      console.log("Platform Token Name:", platformTokenName);
      console.log("Platform Token Symbol:", platformTokenSymbol);
      console.log("Total Platform Token Supply:", ethers.formatUnits(platformTokenTotalSupply, 18));
      console.log(
        "Wallet Platform Token Balance:",
        ethers.formatUnits(walletPlatformTokenBalance, 18)
      );
    } catch (error) {
      console.error("❌ Error getting Platform Token supply:", error.message);
    }

    // 2. Treasury Balances
    console.log("\n=== 2. Treasury Balances ===");
    try {
      const treasuryUSDCBalance = await treasuryContract.totalUSDCBalance();
      const treasuryCompoundYield = await treasuryContract.getCompoundYield();
      const treasuryTotalBalance = await treasuryContract.getTreasuryBalance();
      const treasuryPlatformTokensMinted = await treasuryContract.totalPlatformTokensMinted();

      console.log("Treasury USDC Balance:", ethers.formatUnits(treasuryUSDCBalance, 6), "USDC");
      console.log("Treasury Compound Yield:", ethers.formatUnits(treasuryCompoundYield, 6), "USDC");
      console.log("Treasury Total Balance:", ethers.formatUnits(treasuryTotalBalance, 6), "USDC");
      console.log(
        "Treasury Platform Tokens Minted:",
        ethers.formatUnits(treasuryPlatformTokensMinted, 18)
      );
    } catch (error) {
      console.error("❌ Error getting Treasury balances:", error.message);
    }

    // 3. cUSDC Balances
    console.log("\n=== 3. cUSDC Balances ===");
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
    } catch (error) {
      console.error("❌ Error getting cUSDC balances:", error.message);
    }

    // 4. USDC Balances
    console.log("\n=== 4. USDC Balances ===");
    try {
      const treasuryUSDCBalanceDirect = await usdcContract.balanceOf(TREASURY_ADDRESS);
      const walletUSDCBalance = await usdcContract.balanceOf(wallet.address);
      const usdcTotalSupply = await usdcContract.totalSupply();

      console.log(
        "Treasury USDC Balance (direct):",
        ethers.formatUnits(treasuryUSDCBalanceDirect, 6),
        "USDC"
      );
      console.log("Wallet USDC Balance:", ethers.formatUnits(walletUSDCBalance, 6), "USDC");
      console.log("USDC Total Supply:", ethers.formatUnits(usdcTotalSupply, 6), "USDC");
    } catch (error) {
      console.error("❌ Error getting USDC balances:", error.message);
    }

    // 5. Escrow Factory Status
    console.log("\n=== 5. Escrow Factory Status ===");
    try {
      const escrows = await escrowFactoryContract.getEscrows();
      console.log("Total Escrows Created:", escrows.length);

      if (escrows.length > 0) {
        console.log("Escrow Addresses:");
        for (let i = 0; i < escrows.length; i++) {
          console.log(`  ${i + 1}. ${escrows[i]}`);
        }
      }
    } catch (error) {
      console.error("❌ Error getting Escrow Factory status:", error.message);
    }

    // 6. System Integrity Check
    console.log("\n=== 6. System Integrity Check ===");
    try {
      // Get all the values we need for comparison
      const platformTokenTotalSupply = await platformTokenContract.totalSupply();
      const treasuryCUSDCBalance = await cusdcContract.balanceOf(TREASURY_ADDRESS);
      const treasuryUSDCBalanceDirect = await usdcContract.balanceOf(TREASURY_ADDRESS);

      // Convert platform token supply from 18 decimals to 6 decimals (USDC equivalent)
      const platformTokenSupplyUSDC = platformTokenTotalSupply / 10 ** 12; // 18 - 6 = 12

      // Calculate total Treasury value (USDC + cUSDC)
      const totalTreasuryValue = treasuryUSDCBalanceDirect + treasuryCUSDCBalance;

      console.log(
        "Platform Token Supply (USDC equivalent):",
        ethers.formatUnits(platformTokenSupplyUSDC, 6)
      );
      console.log("Treasury cUSDC Balance:", ethers.formatUnits(treasuryCUSDCBalance, 6));
      console.log("Treasury USDC Balance:", ethers.formatUnits(treasuryUSDCBalanceDirect, 6));
      console.log("Total Treasury Value:", ethers.formatUnits(totalTreasuryValue, 6));

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
      }

      // Additional checks
      if (treasuryCUSDCBalance > 0) {
        console.log("✅ Treasury has cUSDC balance (yield generation active)");
      } else {
        console.log("⚠️  Treasury has no cUSDC balance");
      }

      if (platformTokenSupplyUSDC > 0) {
        console.log("✅ Platform Tokens have been minted");
      } else {
        console.log("⚠️  No Platform Tokens have been minted");
      }
    } catch (error) {
      console.error("❌ Error during system integrity check:", error.message);
    }

    // 7. Summary
    console.log("\n=== 7. Audit Summary ===");
    try {
      const platformTokenTotalSupply = await platformTokenContract.totalSupply();
      const treasuryCUSDCBalance = await cusdcContract.balanceOf(TREASURY_ADDRESS);
      const treasuryUSDCBalanceDirect = await usdcContract.balanceOf(TREASURY_ADDRESS);
      const escrows = await escrowFactoryContract.getEscrows();

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
      console.log(`  • Escrows Created: ${escrows.length}`);

      const totalTreasuryValue = treasuryUSDCBalanceDirect + treasuryCUSDCBalance;
      const platformTokenSupplyUSDC = platformTokenTotalSupply / 10 ** 12;

      if (Math.abs(platformTokenSupplyUSDC - totalTreasuryValue) <= ethers.parseUnits("0.001", 6)) {
        console.log("✅ System is healthy and balanced!");
      } else {
        console.log("❌ System has balance discrepancies!");
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
auditSystemBalances().catch(console.error);
