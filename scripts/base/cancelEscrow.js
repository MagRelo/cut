import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), "contracts", ".env") });

// Escrow ABI - just the functions we need
const ESCROW_ABI = [
  "function cancelAndRefund() external",
  "function state() external view returns (uint8)",
  "function oracle() external view returns (address)",
  "function paymentToken() external view returns (address)",
  "function totalInitialDeposits() external view returns (uint256)",
  "function getParticipantsCount() external view returns (uint256)",
  "function details() external view returns (uint256 depositAmount, uint256 expiry)",
  "function depositBalance(address account) external view returns (uint256)",
];

// ERC20 ABI for token info
const ERC20_ABI = [
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function balanceOf(address account) external view returns (uint256)",
];

// Enum for escrow states
const EscrowState = {
  0: "OPEN",
  1: "IN_PROGRESS",
  2: "SETTLED",
  3: "CANCELLED",
};

async function cancelEscrow() {
  // Get environment variables
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";
  const ESCROW_ADDRESS = process.env.ESCROW_ADDRESS;

  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  if (!ESCROW_ADDRESS) {
    throw new Error("ESCROW_ADDRESS environment variable is required");
  }

  // Validate escrow address
  if (!ethers.isAddress(ESCROW_ADDRESS)) {
    throw new Error("Invalid ESCROW_ADDRESS");
  }

  // Connect to the network
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("🔗 Connected to network:", (await provider.getNetwork()).name);
  console.log("👛 Wallet address:", wallet.address);
  console.log("📋 Escrow address:", ESCROW_ADDRESS);

  // Create escrow contract instance
  const escrow = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, wallet);

  try {
    // Get escrow details before cancellation
    console.log("\n📊 Fetching escrow details...");

    const state = await escrow.state();
    const oracle = await escrow.oracle();
    const paymentTokenAddress = await escrow.paymentToken();
    const totalInitialDeposits = await escrow.totalInitialDeposits();
    const participantsCount = await escrow.getParticipantsCount();

    console.log("\n🔍 Escrow Information:");
    const stateNum = Number(state);
    console.log("  Current state:", EscrowState[stateNum] || `Unknown (${state})`);
    console.log("  Oracle address:", oracle);
    console.log("  Payment token:", paymentTokenAddress);
    console.log("  Total deposits:", ethers.formatUnits(totalInitialDeposits, 6));
    console.log("  Participants count:", participantsCount.toString());

    // Get token info
    const paymentToken = new ethers.Contract(paymentTokenAddress, ERC20_ABI, wallet);
    let tokenSymbol = "tokens";
    let tokenDecimals = 6;

    try {
      tokenSymbol = await paymentToken.symbol();
      tokenDecimals = await paymentToken.decimals();
      console.log("  Token symbol:", tokenSymbol);
    } catch (error) {
      console.log("  ⚠️ Could not get token symbol:", error.message);
    }

    // Check if wallet is the oracle
    if (wallet.address.toLowerCase() !== oracle.toLowerCase()) {
      console.log("\n⚠️ WARNING: Your wallet address is not the oracle!");
      console.log("  Your address:", wallet.address);
      console.log("  Oracle address:", oracle);
      console.log("  Only the oracle can cancel the escrow.");
      throw new Error("Not authorized - only oracle can cancel escrow");
    }

    // Check if escrow is in a cancellable state
    if (stateNum !== 0 && stateNum !== 1) {
      // Not OPEN or IN_PROGRESS
      console.log("\n⚠️ WARNING: Escrow is not in a cancellable state!");
      console.log("  Current state:", EscrowState[stateNum]);
      console.log("  Required state: OPEN or IN_PROGRESS");
      throw new Error(`Escrow cannot be cancelled in ${EscrowState[stateNum]} state`);
    }

    console.log("\n✅ Wallet is authorized to cancel this escrow");

    // Get escrow contract balance before cancellation
    let escrowBalanceBefore = BigInt(0);
    try {
      escrowBalanceBefore = await paymentToken.balanceOf(ESCROW_ADDRESS);
      console.log(
        "\n💰 Escrow contract balance before:",
        ethers.formatUnits(escrowBalanceBefore, tokenDecimals),
        tokenSymbol
      );
    } catch (error) {
      console.log("\n⚠️ Could not read token balance (non-standard token?)");
      console.log("   Proceeding with cancellation anyway...");
    }

    // Confirm action
    console.log("\n⚠️ IMPORTANT: This will cancel the escrow and refund all participants!");
    console.log(
      "  Total amount to be refunded:",
      ethers.formatUnits(totalInitialDeposits, tokenDecimals),
      tokenSymbol
    );
    console.log("  Number of participants to refund:", participantsCount.toString());

    // Cancel and refund escrow
    console.log("\n🚫 Cancelling escrow and refunding participants...");
    console.log("⏳ Sending transaction...");

    const cancelTx = await escrow.cancelAndRefund({
      gasLimit: 500000 + Number(participantsCount) * 100000, // Dynamic gas limit based on participants
    });
    console.log("📝 Transaction hash:", cancelTx.hash);

    // Wait for transaction to be mined
    console.log("⏳ Waiting for transaction confirmation...");
    const cancelReceipt = await cancelTx.wait();
    console.log("✅ Transaction confirmed in block:", cancelReceipt.blockNumber);
    console.log("⛽ Gas used:", cancelReceipt.gasUsed.toString());

    // Get escrow details after cancellation
    console.log("\n📊 Fetching updated escrow details...");

    let stateAfter, totalInitialDepositsAfter, participantsCountAfter;
    let escrowBalanceAfter = BigInt(0);

    try {
      stateAfter = await escrow.state();
    } catch (error) {
      console.log("⚠️ Could not read state after cancellation");
      stateAfter = 3; // Assume CANCELLED
    }

    try {
      totalInitialDepositsAfter = await escrow.totalInitialDeposits();
    } catch (error) {
      console.log("⚠️ Could not read total deposits after cancellation");
      totalInitialDepositsAfter = BigInt(0);
    }

    try {
      participantsCountAfter = await escrow.getParticipantsCount();
    } catch (error) {
      console.log("⚠️ Could not read participants count after cancellation");
      participantsCountAfter = BigInt(0);
    }

    try {
      escrowBalanceAfter = await paymentToken.balanceOf(ESCROW_ADDRESS);
    } catch (error) {
      // Ignore balance read errors
    }

    console.log("\n📈 Results:");
    const stateAfterNum = Number(stateAfter);
    console.log("  New state:", EscrowState[stateAfterNum] || `Unknown (${stateAfter})`);
    console.log(
      "  Total deposits after:",
      ethers.formatUnits(totalInitialDepositsAfter, tokenDecimals),
      tokenSymbol
    );
    console.log("  Participants count after:", participantsCountAfter.toString());

    if (escrowBalanceBefore > 0 || escrowBalanceAfter > 0) {
      console.log(
        "  Escrow contract balance after:",
        ethers.formatUnits(escrowBalanceAfter, tokenDecimals),
        tokenSymbol
      );

      // Calculate refunded amount
      const totalRefunded = escrowBalanceBefore - escrowBalanceAfter;
      console.log(
        "\n💸 Total refunded:",
        ethers.formatUnits(totalRefunded, tokenDecimals),
        tokenSymbol
      );
    }

    console.log(
      "\n🎉 Successfully cancelled escrow and refunded all",
      participantsCount.toString(),
      "participants!"
    );

    // Check for events
    if (cancelReceipt.logs && cancelReceipt.logs.length > 0) {
      console.log("\n📋 Transaction events:");
      for (const log of cancelReceipt.logs) {
        try {
          const parsedLog = escrow.interface.parseLog({
            topics: log.topics,
            data: log.data,
          });
          if (parsedLog) {
            console.log("  -", parsedLog.name);
          }
        } catch (error) {
          // Not an escrow event, skip
        }
      }
    }
  } catch (error) {
    console.error("\n❌ Error cancelling escrow:", error.message);

    // Try to decode custom errors if available
    if (error.data) {
      console.error("📋 Error data:", error.data);

      // Common custom error signatures
      const errorSignatures = {
        "0x82b42900": "Unauthorized",
        "0x8456cb59": "Pausable: paused",
        "0x4e487b71": "Panic error",
      };

      const errorSignature = error.data.slice(0, 10);
      const knownError = errorSignatures[errorSignature];

      if (knownError) {
        console.error(`🔍 Detected error: ${knownError}`);
      }
    }

    // Additional debugging information
    console.error("\n🔍 Debug information:");
    console.error("  Error name:", error.name);
    console.error("  Error code:", error.code);
    if (error.transaction) {
      console.error("  Transaction:", error.transaction);
    }

    process.exit(1);
  }
}

// Run the script
cancelEscrow().catch(console.error);
