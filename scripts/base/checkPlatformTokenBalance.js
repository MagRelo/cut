import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), "contracts", ".env") });

// PlatformToken (CUT) ABI
const PLATFORM_TOKEN_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external pure returns (uint8)",
  "function totalSupply() external view returns (uint256)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function owner() external view returns (address)",
  "function depositManager() external view returns (address)",
];

// DepositManager ABI - for related info
const DEPOSIT_MANAGER_ABI = [
  "function getTokenManagerUSDCBalance() external view returns (uint256)",
  "function getCompoundUSDCBalance() external view returns (uint256)",
  "function getTotalAvailableBalance() external view returns (uint256)",
];

// USDC ABI
const USDC_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external pure returns (uint8)",
];

async function getLatestDeployment() {
  const broadcastDir = path.join(process.cwd(), "contracts", "broadcast", "Deploy_base.s.sol");

  if (!fs.existsSync(broadcastDir)) {
    throw new Error(
      "Deployment broadcast directory not found. Please run the deployment script first."
    );
  }

  // Find the latest deployment
  const deployments = fs
    .readdirSync(broadcastDir)
    .filter((dir) => fs.statSync(path.join(broadcastDir, dir)).isDirectory())
    .sort()
    .reverse();

  if (deployments.length === 0) {
    throw new Error("No deployments found in broadcast directory");
  }

  const latestDeployment = deployments[0];
  const latestRunFile = path.join(broadcastDir, latestDeployment, "run-latest.json");

  if (!fs.existsSync(latestRunFile)) {
    throw new Error("Latest deployment file not found");
  }

  const deploymentData = JSON.parse(fs.readFileSync(latestRunFile, "utf8"));

  // Find DepositManager and PlatformToken deployments
  const depositManagerDeployment = deploymentData.transactions.find(
    (tx) => tx.contractName === "DepositManager"
  );
  const platformTokenDeployment = deploymentData.transactions.find(
    (tx) => tx.contractName === "PlatformToken"
  );

  if (!depositManagerDeployment) {
    throw new Error("DepositManager deployment not found in latest deployment");
  }
  if (!platformTokenDeployment) {
    throw new Error("PlatformToken deployment not found in latest deployment");
  }

  // Real USDC address on Base network
  const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7c32D4f71b54bdA02913";

  return {
    depositManager: depositManagerDeployment.contractAddress,
    usdc: USDC_ADDRESS,
    platformToken: platformTokenDeployment.contractAddress,
  };
}

// Helper function to sleep
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkPlatformTokenBalance() {
  // Get environment variables
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";
  const USE_LATEST_DEPLOYMENT = process.env.USE_LATEST_DEPLOYMENT === "true";

  // Get addresses to check (comma-separated list)
  const CHECK_ADDRESSES = process.env.CHECK_ADDRESSES || "";
  const addressesToCheck = CHECK_ADDRESSES.split(",").filter((addr) => addr.trim());

  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  let DEPOSIT_MANAGER_ADDRESS, USDC_ADDRESS, PLATFORM_TOKEN_ADDRESS;

  if (USE_LATEST_DEPLOYMENT) {
    try {
      const addresses = await getLatestDeployment();
      DEPOSIT_MANAGER_ADDRESS = addresses.depositManager;
      USDC_ADDRESS = addresses.usdc.toLowerCase();
      PLATFORM_TOKEN_ADDRESS = addresses.platformToken;
      console.log("📋 Using addresses from latest deployment:");
      console.log("  DepositManager:", DEPOSIT_MANAGER_ADDRESS);
      console.log("  USDC:", USDC_ADDRESS);
      console.log("  PlatformToken:", PLATFORM_TOKEN_ADDRESS);
    } catch (error) {
      console.error("Failed to get latest deployment:", error.message);
      console.log("Falling back to environment variables");
      DEPOSIT_MANAGER_ADDRESS = process.env.DEPOSIT_MANAGER_ADDRESS;
      USDC_ADDRESS = process.env.USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7c32D4f71b54bdA02913";
      PLATFORM_TOKEN_ADDRESS = process.env.PLATFORM_TOKEN_ADDRESS;
    }
  } else {
    DEPOSIT_MANAGER_ADDRESS = process.env.DEPOSIT_MANAGER_ADDRESS;
    USDC_ADDRESS = process.env.USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7c32D4f71b54bdA02913";
    PLATFORM_TOKEN_ADDRESS = process.env.PLATFORM_TOKEN_ADDRESS;
  }

  if (!PLATFORM_TOKEN_ADDRESS) {
    throw new Error("PLATFORM_TOKEN_ADDRESS is required");
  }

  // Validate contract addresses
  if (!ethers.isAddress(PLATFORM_TOKEN_ADDRESS)) {
    throw new Error("Invalid PLATFORM_TOKEN_ADDRESS");
  }

  // Connect to the network
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const network = await provider.getNetwork();
  console.log("\n🔗 Connected to network:", network.name);
  console.log("🔗 Chain ID:", network.chainId.toString());
  console.log("🔗 RPC URL:", RPC_URL);
  console.log("👛 Wallet address:", wallet.address);

  // Warn if not on Base mainnet (chain ID 8453)
  if (network.chainId !== 8453n) {
    console.log("\n⚠️  WARNING: You are not connected to Base mainnet (chain ID 8453)");
    console.log("⚠️  Current chain ID:", network.chainId.toString());
    console.log("⚠️  Make sure this is intentional!\n");
  }

  console.log("\n" + "=".repeat(80));

  // Create contract instances
  const platformToken = new ethers.Contract(PLATFORM_TOKEN_ADDRESS, PLATFORM_TOKEN_ABI, provider);

  try {
    // Verify contract exists
    const code = await provider.getCode(PLATFORM_TOKEN_ADDRESS);
    if (code === "0x") {
      const errorMsg = [
        `No contract found at PlatformToken address ${PLATFORM_TOKEN_ADDRESS}.`,
        ``,
        `This could mean:`,
        `  1. The contract hasn't been deployed to this network yet`,
        `  2. The deployment address is from a different network`,
        `  3. You're connected to the wrong RPC URL`,
        ``,
        `Current network: ${network.name} (Chain ID: ${network.chainId})`,
        `Expected network: Base (Chain ID: 8453)`,
        ``,
        `Troubleshooting:`,
        USE_LATEST_DEPLOYMENT
          ? `  - The deployment was found in contracts/broadcast/Deploy_base.s.sol/`
          : `  - You're using PLATFORM_TOKEN_ADDRESS from environment variables`,
        `  - Check that the contract is deployed to Base mainnet`,
        `  - Verify your BASE_RPC_URL is correct`,
        `  - Make sure you're not using Sepolia deployment addresses`,
        ``,
        `Try running: forge script script/Deploy_base.s.sol --rpc-url $BASE_RPC_URL --broadcast`,
      ].join("\n");
      throw new Error(errorMsg);
    }

    // Get token information - ONE CALL AT A TIME with delays
    console.log("\n📊 PLATFORM TOKEN INFORMATION");
    console.log("=".repeat(80));
    console.log("⏳ Fetching data (rate-limiting to avoid RPC issues)...\n");

    let name, symbol, decimals, totalSupply, owner, depositManager;

    try {
      name = await platformToken.name();
      console.log("  ✓ Token Name:", name);
      await sleep(1000);

      symbol = await platformToken.symbol();
      console.log("  ✓ Token Symbol:", symbol);
      await sleep(1000);

      decimals = await platformToken.decimals();
      const decimalsNum = Number(decimals);
      console.log("  ✓ Decimals:", decimalsNum);
      await sleep(1000);

      totalSupply = await platformToken.totalSupply();
      console.log("  ✓ Total Supply:", ethers.formatUnits(totalSupply, decimalsNum), symbol);
      await sleep(1000);

      owner = await platformToken.owner();
      console.log("  ✓ Owner:", owner);
      await sleep(1000);

      depositManager = await platformToken.depositManager();
      console.log("  ✓ DepositManager:", depositManager);

      console.log("  ✓ Contract Address:", PLATFORM_TOKEN_ADDRESS);
    } catch (error) {
      throw new Error(
        `Failed to fetch token information.\n` +
          `Error: ${error.message}\n` +
          `Try using a better RPC provider.`
      );
    }

    // Check wallet balance
    const decimalsNum = Number(decimals);
    console.log("\n💰 WALLET BALANCE");
    console.log("=".repeat(80));
    console.log("  Address:", wallet.address);

    await sleep(1000);
    let walletBalance;
    try {
      walletBalance = await platformToken.balanceOf(wallet.address);
      const walletPercentage =
        totalSupply > 0n ? ((Number(walletBalance) * 100) / Number(totalSupply)).toFixed(4) : "0";
      console.log("  ✓ Balance:", ethers.formatUnits(walletBalance, decimalsNum), symbol);
      console.log("  ✓ Percentage of Total Supply:", walletPercentage + "%");
    } catch (error) {
      console.log(`  ✗ Could not fetch balance: ${error.message}`);
      walletBalance = 0n;
    }

    // Check additional addresses if provided
    if (addressesToCheck.length > 0) {
      console.log("\n👥 ADDITIONAL ADDRESSES");
      console.log("=".repeat(80));

      for (const addr of addressesToCheck) {
        const address = addr.trim();
        if (!ethers.isAddress(address)) {
          console.log(`  ⚠️ Invalid address: ${address}`);
          continue;
        }

        console.log(`\n  Address: ${address}`);
        await sleep(1000);

        try {
          const balance = await platformToken.balanceOf(address);
          const percentage =
            totalSupply > 0n ? ((Number(balance) * 100) / Number(totalSupply)).toFixed(4) : "0";
          console.log(`  ✓ Balance: ${ethers.formatUnits(balance, decimalsNum)} ${symbol}`);
          console.log(`  ✓ Percentage: ${percentage}%`);
        } catch (error) {
          console.log(`  ✗ Could not fetch balance: ${error.message}`);
        }
      }
    }

    // Check DepositManager balances if available
    if (DEPOSIT_MANAGER_ADDRESS && ethers.isAddress(DEPOSIT_MANAGER_ADDRESS)) {
      console.log("\n🏦 DEPOSIT MANAGER INFORMATION");
      console.log("=".repeat(80));
      console.log("  Address:", DEPOSIT_MANAGER_ADDRESS);

      const depositManagerContract = new ethers.Contract(
        DEPOSIT_MANAGER_ADDRESS,
        DEPOSIT_MANAGER_ABI,
        provider
      );

      try {
        await sleep(1000);
        const totalAvailableBalance = await depositManagerContract.getTotalAvailableBalance();
        console.log(
          "  ✓ Total Available USDC:",
          ethers.formatUnits(totalAvailableBalance, 6),
          "USDC"
        );

        // Calculate backing ratio
        if (totalSupply > 0n) {
          const usdcBackingIn18Decimals = totalAvailableBalance * BigInt(10 ** 12);
          const backingRatio = (
            (Number(usdcBackingIn18Decimals) * 100) /
            Number(totalSupply)
          ).toFixed(2);

          console.log("\n  📊 Backing Ratio:");
          console.log(
            `    ${ethers.formatUnits(totalAvailableBalance, 6)} USDC backing ${ethers.formatUnits(
              totalSupply,
              decimalsNum
            )} ${symbol}`
          );
          console.log(`    Ratio: ${backingRatio}%`);

          if (Number(backingRatio) >= 100) {
            console.log("    ✅ Fully backed!");
          } else {
            console.log(`    ⚠️ Under-backed by ${(100 - Number(backingRatio)).toFixed(2)}%`);
          }
        }
      } catch (error) {
        console.log("  ✗ Could not fetch DepositManager balances:", error.message);
      }
    }

    // Top holders summary (if DepositManager exists, show it)
    console.log("\n📈 DISTRIBUTION SUMMARY");
    console.log("=".repeat(80));

    // Fetch DepositManager balance once
    let depositManagerBalance = 0n;
    if (DEPOSIT_MANAGER_ADDRESS && ethers.isAddress(DEPOSIT_MANAGER_ADDRESS)) {
      await sleep(1000);
      try {
        depositManagerBalance = await platformToken.balanceOf(DEPOSIT_MANAGER_ADDRESS);
        const dmPercentage =
          totalSupply > 0n
            ? ((Number(depositManagerBalance) * 100) / Number(totalSupply)).toFixed(2)
            : "0";
        console.log(
          "  ✓ DepositManager:",
          ethers.formatUnits(depositManagerBalance, decimalsNum),
          symbol,
          `(${dmPercentage}%)`
        );
      } catch (error) {
        console.log("  ✗ Could not fetch DepositManager balance");
      }
    }

    // Show wallet balance
    if (walletBalance && walletBalance > 0n) {
      const walletPercentage =
        totalSupply > 0n ? ((Number(walletBalance) * 100) / Number(totalSupply)).toFixed(4) : "0";
      console.log(
        "  ✓ Your Wallet:",
        ethers.formatUnits(walletBalance, decimalsNum),
        symbol,
        `(${walletPercentage}%)`
      );
    } else {
      console.log("  ✗ Your Wallet: No balance data");
    }

    // Calculate circulating supply
    if (depositManagerBalance > 0n && totalSupply > 0n) {
      const circulatingSupply = totalSupply - depositManagerBalance;
      const circPercentage = ((Number(circulatingSupply) * 100) / Number(totalSupply)).toFixed(2);
      console.log(
        "\n  🔄 Circulating Supply:",
        ethers.formatUnits(circulatingSupply, decimalsNum),
        symbol,
        `(${circPercentage}%)`
      );
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ Balance check completed!");
    console.log("=".repeat(80) + "\n");
  } catch (error) {
    console.error("\n❌ Error checking balances:", error.message);
    console.error("\n🔍 Debug information:");
    console.error("  Error name:", error.name);
    console.error("  Error code:", error.code);

    if (error.data) {
      console.error("  Error data:", error.data);
    }

    // Additional troubleshooting info
    if (error.code === "CALL_EXCEPTION") {
      console.error("\n💡 Troubleshooting CALL_EXCEPTION:");
      console.error("  1. RPC Issue: Try a different RPC URL (Alchemy, Infura, QuickNode)");
      console.error("     Set: BASE_RPC_URL=https://your-rpc-url");
      console.error("  2. Verify contract on block explorer:");
      console.error(`     https://basescan.org/address/${PLATFORM_TOKEN_ADDRESS}`);
      console.error("  3. Rate limiting: Wait a moment and try again");
      console.error("  4. Network congestion: The Base network might be experiencing issues");
    }

    process.exit(1);
  }
}

// Run the script
checkPlatformTokenBalance().catch(console.error);
