import { ethers } from "ethers";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

async function testCorrectCUSDC() {
  try {
    // Configuration
    let RPC_URL = process.env.RPC_URL || "https://mainnet.base.org";
    const PRIVATE_KEY = process.env.PRIVATE_KEY;

    if (!PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY environment variable is required");
    }

    // Contract addresses
    const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    const CORRECT_CUSDC_ADDRESS = "0xb125e6687d4313864e53df431d5425969c15eb2f";

    // Connect to network
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log("=== Testing Correct cUSDC Contract ===");
    console.log("Network:", RPC_URL);
    console.log("Correct cUSDC:", CORRECT_CUSDC_ADDRESS);

    // Create contract instance with Comet V3 functions
    const cusdcContract = new ethers.Contract(
      CORRECT_CUSDC_ADDRESS,
      [
        // Pause status functions
        "function isSupplyPaused() external view returns (bool)",
        "function isTransferPaused() external view returns (bool)",
        "function isWithdrawPaused() external view returns (bool)",

        // Configuration functions
        "function governor() external view returns (address)",
        "function pauseGuardian() external view returns (address)",
        "function baseToken() external view returns (address)",
        "function numAssets() external view returns (uint8)",

        // Asset info functions
        "function getAssetInfo(uint8 i) external view returns (tuple(uint8 offset, address asset, address priceFeed, uint64 scale, uint64 borrowCollateralFactor, uint64 liquidateCollateralFactor, uint64 liquidationFactor, uint128 supplyCap))",
        "function getAssetInfoByAddress(address asset) external view returns (tuple(uint8 offset, address asset, address priceFeed, uint64 scale, uint64 borrowCollateralFactor, uint64 liquidateCollateralFactor, uint64 liquidationFactor, uint128 supplyCap))",

        // Supply functions
        "function supply(address asset, uint amount) external",
        "function supplyTo(address dst, address asset, uint amount) external",

        // Balance functions
        "function balanceOf(address owner) external view returns (uint256)",
        "function totalSupply() external view returns (uint256)",
      ],
      wallet
    );

    // Check pause status
    console.log("\n=== Pause Status ===");
    try {
      const isSupplyPaused = await cusdcContract.isSupplyPaused();
      const isTransferPaused = await cusdcContract.isTransferPaused();
      const isWithdrawPaused = await cusdcContract.isWithdrawPaused();

      console.log("Supply Paused:", isSupplyPaused);
      console.log("Transfer Paused:", isTransferPaused);
      console.log("Withdraw Paused:", isWithdrawPaused);

      if (isSupplyPaused) {
        console.log("❌ SUPPLY IS PAUSED!");
        return;
      }
    } catch (error) {
      console.error("❌ Error checking pause status:", error.message);
    }

    // Check configuration
    console.log("\n=== Contract Configuration ===");
    try {
      const governor = await cusdcContract.governor();
      const pauseGuardian = await cusdcContract.pauseGuardian();
      const baseToken = await cusdcContract.baseToken();
      const numAssets = await cusdcContract.numAssets();

      console.log("Governor:", governor);
      console.log("Pause Guardian:", pauseGuardian);
      console.log("Base Token:", baseToken);
      console.log("Number of Assets:", numAssets);

      if (baseToken.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
        console.log("❌ Base token mismatch! Expected USDC but got:", baseToken);
      } else {
        console.log("✅ Base token matches USDC");
      }
    } catch (error) {
      console.error("❌ Error checking configuration:", error.message);
    }

    // Check if USDC is a supported asset
    console.log("\n=== Asset Support ===");
    try {
      const assetInfo = await cusdcContract.getAssetInfoByAddress(USDC_ADDRESS);
      console.log("USDC Asset Info:", assetInfo);
      console.log("USDC Supply Cap:", ethers.formatUnits(assetInfo.supplyCap, 6));
      console.log("USDC Scale:", assetInfo.scale);

      // Check current supply
      const totalSupply = await cusdcContract.totalSupply();
      console.log("Current Total Supply:", ethers.formatUnits(totalSupply, 6));

      if (totalSupply >= assetInfo.supplyCap) {
        console.log("❌ SUPPLY CAP EXCEEDED!");
      } else {
        console.log("✅ Supply cap not exceeded");
      }
    } catch (error) {
      console.error("❌ Error checking asset support:", error.message);
      console.log("This suggests USDC might not be a supported asset in this Comet contract");
    }

    // Test supply call
    console.log("\n=== Testing Supply Call ===");
    try {
      const testAmount = ethers.parseUnits("0.01", 6);
      console.log("Testing supply with amount:", ethers.formatUnits(testAmount, 6), "USDC");

      // Try to estimate gas to see if it works
      const gasEstimate = await cusdcContract.supply.estimateGas(USDC_ADDRESS, testAmount);
      console.log("Gas estimate:", gasEstimate.toString());
      console.log("✅ Supply call would succeed!");
    } catch (error) {
      console.error("❌ Supply call failed:", error.message);
      console.error("Error data:", error.data);
      console.error("Error reason:", error.reason);
    }
  } catch (error) {
    console.error("❌ Error during test:", error);
    process.exit(1);
  }
}

// Run the test
testCorrectCUSDC().catch(console.error);
