import { ethers } from "ethers";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

async function checkEscrowFactory() {
  try {
    // Configuration
    let RPC_URL = process.env.RPC_URL || "https://mainnet.base.org";
    const PRIVATE_KEY = process.env.PRIVATE_KEY;

    if (!PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY environment variable is required");
    }

    // Contract addresses (from deployment)
    const ESCROW_FACTORY_ADDRESS = "0x322f9bb0c55a1ac717473dc12c759bb40ada0a8b";
    const PLATFORM_TOKEN_ADDRESS = "0x1699Eb97Dcf31B0ad2A964028e00C7CEB92B453B";
    const TREASURY_ADDRESS = "0x9Ba098Bcd17b3474E6dA824A43704b8baA8cC3b5";

    // Connect to network
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log("=== Checking EscrowFactory Configuration ===");
    console.log("Network:", RPC_URL);
    console.log("Wallet:", wallet.address);
    console.log("EscrowFactory:", ESCROW_FACTORY_ADDRESS);
    console.log("PlatformToken:", PLATFORM_TOKEN_ADDRESS);
    console.log("Treasury:", TREASURY_ADDRESS);

    // Create contract instances
    const escrowFactoryContract = new ethers.Contract(
      ESCROW_FACTORY_ADDRESS,
      [
        "function platformToken() external view returns (address)",
        "function treasury() external view returns (address)",
        "function owner() external view returns (address)",
        "function getEscrowCount() external view returns (uint256)",
        "function getEscrow(uint256 index) external view returns (address)",
        "function getAllEscrows() external view returns (address[])",
      ],
      wallet
    );

    const platformTokenContract = new ethers.Contract(
      PLATFORM_TOKEN_ADDRESS,
      [
        "function name() external view returns (string)",
        "function symbol() external view returns (string)",
        "function treasury() external view returns (address)",
      ],
      wallet
    );

    // Check EscrowFactory configuration
    console.log("\n=== EscrowFactory Configuration ===");
    try {
      const factoryPlatformToken = await escrowFactoryContract.platformToken();
      const factoryTreasury = await escrowFactoryContract.treasury();
      const factoryOwner = await escrowFactoryContract.owner();
      const escrowCount = await escrowFactoryContract.getEscrowCount();

      console.log("Factory Platform Token:", factoryPlatformToken);
      console.log("Factory Treasury:", factoryTreasury);
      console.log("Factory Owner:", factoryOwner);
      console.log("Escrow Count:", escrowCount.toString());

      // Check if addresses match
      if (factoryPlatformToken.toLowerCase() === PLATFORM_TOKEN_ADDRESS.toLowerCase()) {
        console.log("✅ Platform Token is correctly set!");
      } else {
        console.log("❌ Platform Token mismatch!");
      }

      if (factoryTreasury.toLowerCase() === TREASURY_ADDRESS.toLowerCase()) {
        console.log("✅ Treasury is correctly set!");
      } else {
        console.log("❌ Treasury mismatch!");
      }

      if (factoryOwner.toLowerCase() === wallet.address.toLowerCase()) {
        console.log("✅ Wallet is the owner!");
      } else {
        console.log("❌ Wallet is NOT the owner!");
      }
    } catch (error) {
      console.error("❌ Error getting EscrowFactory config:", error.message);
    }

    // Check Platform Token configuration
    console.log("\n=== Platform Token Configuration ===");
    try {
      const platformTokenName = await platformTokenContract.name();
      const platformTokenSymbol = await platformTokenContract.symbol();
      const platformTokenTreasury = await platformTokenContract.treasury();

      console.log("Platform Token Name:", platformTokenName);
      console.log("Platform Token Symbol:", platformTokenSymbol);
      console.log("Platform Token Treasury:", platformTokenTreasury);

      if (platformTokenTreasury.toLowerCase() === TREASURY_ADDRESS.toLowerCase()) {
        console.log("✅ Platform Token Treasury is correctly set!");
      } else {
        console.log("❌ Platform Token Treasury mismatch!");
      }
    } catch (error) {
      console.error("❌ Error getting Platform Token config:", error.message);
    }

    // Check existing escrows
    console.log("\n=== Existing Escrows ===");
    try {
      const escrowCount = await escrowFactoryContract.getEscrowCount();
      console.log("Total Escrows:", escrowCount.toString());

      if (escrowCount > 0) {
        console.log("Listing existing escrows:");
        for (let i = 0; i < escrowCount; i++) {
          try {
            const escrowAddress = await escrowFactoryContract.getEscrow(i);
            console.log(`  Escrow ${i}: ${escrowAddress}`);
          } catch (error) {
            console.log(`  Escrow ${i}: Error getting address`);
          }
        }
      } else {
        console.log("No escrows created yet");
      }
    } catch (error) {
      console.error("❌ Error getting escrows:", error.message);
    }

    // Test creating a new escrow
    console.log("\n=== Testing Escrow Creation ===");
    try {
      const escrowContract = new ethers.Contract(
        ESCROW_FACTORY_ADDRESS,
        [
          "function createEscrow(address _buyer, address _seller, uint256 _amount, uint256 _deadline) external returns (address)",
        ],
        wallet
      );

      // Test parameters
      const testBuyer = wallet.address;
      const testSeller = "0x0000000000000000000000000000000000000001"; // Dummy address
      const testAmount = ethers.parseUnits("0.01", 18); // 0.01 Platform Tokens
      const testDeadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      console.log("Test Buyer:", testBuyer);
      console.log("Test Seller:", testSeller);
      console.log("Test Amount:", ethers.formatUnits(testAmount, 18), "Platform Tokens");
      console.log("Test Deadline:", new Date(testDeadline * 1000).toISOString());

      // Try to estimate gas for escrow creation
      try {
        const gasEstimate = await escrowContract.createEscrow.estimateGas(
          testBuyer,
          testSeller,
          testAmount,
          testDeadline
        );
        console.log("Gas estimate for escrow creation:", gasEstimate.toString());
        console.log("✅ Escrow creation would succeed!");
      } catch (error) {
        console.error("❌ Escrow creation would fail:", error.message);
      }
    } catch (error) {
      console.error("❌ Error testing escrow creation:", error.message);
    }

    // Overall status
    console.log("\n=== Overall Configuration Status ===");
    try {
      const factoryPlatformToken = await escrowFactoryContract.platformToken();
      const factoryTreasury = await escrowFactoryContract.treasury();
      const platformTokenTreasury = await platformTokenContract.treasury();

      const platformTokenMatch =
        factoryPlatformToken.toLowerCase() === PLATFORM_TOKEN_ADDRESS.toLowerCase();
      const treasuryMatch = factoryTreasury.toLowerCase() === TREASURY_ADDRESS.toLowerCase();
      const platformTokenTreasuryMatch =
        platformTokenTreasury.toLowerCase() === TREASURY_ADDRESS.toLowerCase();

      if (platformTokenMatch && treasuryMatch && platformTokenTreasuryMatch) {
        console.log("✅ EscrowFactory is properly configured!");
        console.log("✅ All addresses are correctly set!");
        console.log("✅ Ready for escrow creation!");
      } else {
        console.log("❌ EscrowFactory configuration issues detected:");
        if (!platformTokenMatch) console.log("  - Platform Token mismatch");
        if (!treasuryMatch) console.log("  - Factory Treasury mismatch");
        if (!platformTokenTreasuryMatch) console.log("  - Platform Token Treasury mismatch");
      }
    } catch (error) {
      console.error("❌ Error checking overall status:", error.message);
    }
  } catch (error) {
    console.error("❌ Error during check:", error);
    process.exit(1);
  }
}

// Run the check
checkEscrowFactory().catch(console.error);
