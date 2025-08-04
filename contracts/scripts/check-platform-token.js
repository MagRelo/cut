import { ethers } from "ethers";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

async function checkPlatformToken() {
  try {
    // Configuration
    let RPC_URL = process.env.RPC_URL || "https://mainnet.base.org";
    const PRIVATE_KEY = process.env.PRIVATE_KEY;

    if (!PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY environment variable is required");
    }

    // Contract addresses
    const PLATFORM_TOKEN_ADDRESS = "0x1699Eb97Dcf31B0ad2A964028e00C7CEB92B453B";
    const FIXED_TREASURY_ADDRESS = "0x43A0688816A5C5Cb18f7050B942c14f154D13fC7";

    // Connect to network
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log("=== Checking PlatformToken ===");
    console.log("Network:", RPC_URL);
    console.log("Wallet:", wallet.address);
    console.log("Platform Token:", PLATFORM_TOKEN_ADDRESS);

    // Create contract instance
    const platformTokenContract = new ethers.Contract(
      PLATFORM_TOKEN_ADDRESS,
      [
        "function treasury() external view returns (address)",
        "function owner() external view returns (address)",
        "function setTreasury(address treasury) external",
        "function symbol() external view returns (string)",
        "function name() external view returns (string)",
      ],
      wallet
    );

    // Check basic info
    console.log("\n=== PlatformToken Info ===");
    try {
      const symbol = await platformTokenContract.symbol();
      const name = await platformTokenContract.name();
      console.log("Name:", name);
      console.log("Symbol:", symbol);
    } catch (error) {
      console.error("❌ Error getting basic info:", error.message);
    }

    // Check owner
    console.log("\n=== Owner Check ===");
    try {
      const owner = await platformTokenContract.owner();
      console.log("Owner:", owner);
      console.log("Current Wallet:", wallet.address);

      if (owner.toLowerCase() === wallet.address.toLowerCase()) {
        console.log("✅ You are the owner!");
      } else {
        console.log("❌ You are NOT the owner");
        console.log("Only the owner can set the treasury");
      }
    } catch (error) {
      console.error("❌ Error getting owner:", error.message);
    }

    // Check current treasury
    console.log("\n=== Treasury Check ===");
    try {
      const currentTreasury = await platformTokenContract.treasury();
      console.log("Current Treasury:", currentTreasury);
      console.log("Expected Treasury:", FIXED_TREASURY_ADDRESS);

      if (currentTreasury.toLowerCase() === FIXED_TREASURY_ADDRESS.toLowerCase()) {
        console.log("✅ Treasury is correctly set!");
      } else {
        console.log("❌ Treasury is NOT correctly set!");
        console.log("Need to set Treasury to:", FIXED_TREASURY_ADDRESS);
      }
    } catch (error) {
      console.error("❌ Error getting treasury:", error.message);
    }

    // Try to set treasury if we're the owner
    console.log("\n=== Setting Treasury ===");
    try {
      const owner = await platformTokenContract.owner();
      if (owner.toLowerCase() === wallet.address.toLowerCase()) {
        console.log("Setting Treasury to:", FIXED_TREASURY_ADDRESS);
        const setTreasuryTx = await platformTokenContract.setTreasury(FIXED_TREASURY_ADDRESS);
        console.log("Set Treasury transaction hash:", setTreasuryTx.hash);
        await setTreasuryTx.wait();
        console.log("✅ Treasury set successfully!");

        // Verify the change
        const newTreasury = await platformTokenContract.treasury();
        console.log("New Treasury:", newTreasury);
      } else {
        console.log("❌ Cannot set treasury - you are not the owner");
        console.log("Owner:", owner);
        console.log("Your wallet:", wallet.address);
      }
    } catch (error) {
      console.error("❌ Error setting treasury:", error.message);
    }
  } catch (error) {
    console.error("❌ Error during check:", error);
    process.exit(1);
  }
}

// Run the check
checkPlatformToken().catch(console.error);
