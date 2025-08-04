import { ethers } from "ethers";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

async function addOracle() {
  try {
    // Configuration
    let RPC_URL = process.env.RPC_URL || "https://mainnet.base.org";
    const PRIVATE_KEY = process.env.PRIVATE_KEY;

    if (!PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY environment variable is required");
    }

    // Contract addresses
    const NEW_ESCROW_FACTORY_ADDRESS = "0xEcDdA95223eA4E7813130fFBcd4B24f362ac4553";

    // Connect to network
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log("=== Adding Oracle to New EscrowFactory ===");
    console.log("Network:", RPC_URL);
    console.log("Wallet:", wallet.address);
    console.log("New EscrowFactory:", NEW_ESCROW_FACTORY_ADDRESS);

    // Create contract instance
    const escrowFactoryContract = new ethers.Contract(
      NEW_ESCROW_FACTORY_ADDRESS,
      [
        "function addOracle(address oracle) external",
        "function oracles(address) external view returns (bool)",
        "function owner() external view returns (address)",
      ],
      wallet
    );

    // Check current oracle status
    console.log("\n=== Current Oracle Status ===");
    try {
      const isOracle = await escrowFactoryContract.oracles(wallet.address);
      const owner = await escrowFactoryContract.owner();

      console.log("Wallet is Oracle:", isOracle);
      console.log("Factory Owner:", owner);
      console.log("Wallet:", wallet.address);

      if (owner.toLowerCase() === wallet.address.toLowerCase()) {
        console.log("✅ Wallet is the owner");
      } else {
        console.log("❌ Wallet is NOT the owner");
        return;
      }
    } catch (error) {
      console.error("❌ Error checking oracle status:", error.message);
      return;
    }

    // Add wallet as oracle
    console.log("\n=== Adding Wallet as Oracle ===");
    try {
      const addOracleTx = await escrowFactoryContract.addOracle(wallet.address);
      console.log("Add Oracle transaction hash:", addOracleTx.hash);
      await addOracleTx.wait();
      console.log("✅ Oracle added successfully!");
    } catch (error) {
      console.error("❌ Error adding oracle:", error.message);
      return;
    }

    // Verify oracle status
    console.log("\n=== Verifying Oracle Status ===");
    try {
      const isOracle = await escrowFactoryContract.oracles(wallet.address);
      console.log("Wallet is Oracle:", isOracle);

      if (isOracle) {
        console.log("✅ Wallet is now an oracle!");
      } else {
        console.log("❌ Wallet is still not an oracle");
      }
    } catch (error) {
      console.error("❌ Error verifying oracle status:", error.message);
    }
  } catch (error) {
    console.error("❌ Error during oracle addition:", error);
    process.exit(1);
  }
}

// Run the script
addOracle().catch(console.error);
