import { ethers } from "ethers";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

async function testNewEscrowFactory() {
  try {
    // Configuration
    let RPC_URL = process.env.RPC_URL || "https://mainnet.base.org";
    const PRIVATE_KEY = process.env.PRIVATE_KEY;

    if (!PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY environment variable is required");
    }

    // Contract addresses
    const NEW_ESCROW_FACTORY_ADDRESS = "0xEcDdA95223eA4E7813130fFBcd4B24f362ac4553";
    const PLATFORM_TOKEN_ADDRESS = "0x1699Eb97Dcf31B0ad2A964028e00C7CEB92B453B";
    const TREASURY_ADDRESS = "0x9Ba098Bcd17b3474E6dA824A43704b8baA8cC3b5";
    const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

    // Connect to network
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log("=== Testing New EscrowFactory ===");
    console.log("Network:", RPC_URL);
    console.log("Wallet:", wallet.address);
    console.log("New EscrowFactory:", NEW_ESCROW_FACTORY_ADDRESS);
    console.log("PlatformToken:", PLATFORM_TOKEN_ADDRESS);
    console.log("Treasury:", TREASURY_ADDRESS);

    // Create contract instances with correct function signatures
    const escrowFactoryContract = new ethers.Contract(
      NEW_ESCROW_FACTORY_ADDRESS,
      [
        "function paymentToken() external view returns (address)",
        "function treasury() external view returns (address)",
        "function owner() external view returns (address)",
        "function oracles(address) external view returns (bool)",
        "function getEscrows() external view returns (address[])",
        "function createEscrow(string memory name, uint256 depositAmount, uint256 maxParticipants, uint256 endTime, address oracle) external returns (address)",
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
    console.log("\n=== New EscrowFactory Configuration ===");
    try {
      const factoryPaymentToken = await escrowFactoryContract.paymentToken();
      const factoryTreasury = await escrowFactoryContract.treasury();
      const factoryOwner = await escrowFactoryContract.owner();
      const isOracle = await escrowFactoryContract.oracles(wallet.address);

      console.log("Factory Payment Token:", factoryPaymentToken);
      console.log("Factory Treasury:", factoryTreasury);
      console.log("Factory Owner:", factoryOwner);
      console.log("Wallet is Oracle:", isOracle);

      // Check if addresses match
      if (factoryPaymentToken.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
        console.log("✅ USDC is correctly set!");
      } else {
        console.log("❌ USDC mismatch!");
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

      if (isOracle) {
        console.log("✅ Wallet is an oracle!");
      } else {
        console.log("❌ Wallet is NOT an oracle!");
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
      const escrows = await escrowFactoryContract.getEscrows();
      console.log("Total Escrows:", escrows.length);

      if (escrows.length > 0) {
        console.log("Listing existing escrows:");
        for (let i = 0; i < escrows.length; i++) {
          console.log(`  Escrow ${i}: ${escrows[i]}`);
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
      // Test parameters
      const testName = "Test Contest";
      const testDepositAmount = ethers.parseUnits("0.01", 6); // 0.01 USDC
      const testMaxParticipants = 10;
      const testEndTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const testOracle = wallet.address;

      console.log("Test Name:", testName);
      console.log("Test Deposit Amount:", ethers.formatUnits(testDepositAmount, 6), "USDC");
      console.log("Test Max Participants:", testMaxParticipants);
      console.log("Test End Time:", new Date(testEndTime * 1000).toISOString());
      console.log("Test Oracle:", testOracle);

      // Try to estimate gas for escrow creation
      try {
        const gasEstimate = await escrowFactoryContract.createEscrow.estimateGas(
          testName,
          testDepositAmount,
          testMaxParticipants,
          testEndTime,
          testOracle
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
      const factoryTreasury = await escrowFactoryContract.treasury();
      const platformTokenTreasury = await platformTokenContract.treasury();
      const isOracle = await escrowFactoryContract.oracles(wallet.address);

      const treasuryMatch = factoryTreasury.toLowerCase() === TREASURY_ADDRESS.toLowerCase();
      const platformTokenTreasuryMatch =
        platformTokenTreasury.toLowerCase() === TREASURY_ADDRESS.toLowerCase();

      if (treasuryMatch && platformTokenTreasuryMatch && isOracle) {
        console.log("✅ New EscrowFactory is properly configured!");
        console.log("✅ All addresses are correctly set!");
        console.log("✅ Wallet is an oracle!");
        console.log("✅ Ready for escrow creation!");
      } else {
        console.log("❌ New EscrowFactory configuration issues detected:");
        if (!treasuryMatch) console.log("  - Factory Treasury mismatch");
        if (!platformTokenTreasuryMatch) console.log("  - Platform Token Treasury mismatch");
        if (!isOracle) console.log("  - Wallet is not an oracle");
      }
    } catch (error) {
      console.error("❌ Error checking overall status:", error.message);
    }
  } catch (error) {
    console.error("❌ Error during test:", error);
    process.exit(1);
  }
}

// Run the test
testNewEscrowFactory().catch(console.error);
