#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");

// Load environment variables from contracts/.env file
dotenv.config({ path: path.join(projectRoot, "contracts", ".env") });

// Configuration
const NETWORKS = {
  sepolia: {
    name: "base_sepolia",
    chainId: 84532,
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL,
    explorerUrl: "https://sepolia.basescan.org",
    blockscoutUrl: "https://base-sepolia.blockscout.com",
    blockscoutApiUrl: "https://base-sepolia.blockscout.com/api",
    verifyChain: "base-sepolia",
  },
  base: {
    name: "base",
    chainId: 8453,
    rpcUrl: process.env.BASE_RPC_URL,
    explorerUrl: "https://basescan.org",
    blockscoutUrl: "https://base.blockscout.com",
    blockscoutApiUrl: "https://base.blockscout.com/api",
    verifyChain: "base",
  },
};

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step) {
  log(`\n${colors.bright}${colors.blue}=== ${step} ===${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, "green");
}

function logError(message) {
  log(`❌ ${message}`, "red");
}

function logWarning(message) {
  log(`⚠️  ${message}`, "yellow");
}

function logInfo(message) {
  log(`ℹ️  ${message}`, "cyan");
}

// Utility functions
function runCommand(command, cwd = projectRoot) {
  try {
    logInfo(`Running: ${command}`);
    const output = execSync(command, {
      cwd,
      stdio: "pipe",
      encoding: "utf8",
    });
    return output.trim();
  } catch (error) {
    logError(`Command failed: ${command}`);
    logError(`Error: ${error.message}`);
    throw error;
  }
}

function loadContractAddresses(network) {
  logStep(`Loading contract addresses for ${network.name}`);

  const configPath = path.join(
    projectRoot,
    "server",
    "src",
    "contracts",
    `${network.name === "base_sepolia" ? "sepolia" : "base"}.json`
  );

  if (!fs.existsSync(configPath)) {
    logError(`Config file not found at ${configPath}`);
    logError("Please deploy contracts first or ensure the config file exists");
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  // Map config keys to contract names
  const addresses = {
    MockUSDC: config.paymentTokenAddress,
    PlatformToken: config.platformTokenAddress,
    DepositManager: config.depositManagerAddress,
    EscrowFactory: config.escrowFactoryAddress,
    MockCompound: config.mockCTokenAddress,
  };

  // Filter out undefined addresses
  const filteredAddresses = Object.fromEntries(
    Object.entries(addresses).filter(
      ([_, addr]) => addr && addr !== "0x0000000000000000000000000000000000000000"
    )
  );

  logSuccess(`Loaded ${Object.keys(filteredAddresses).length} contract addresses`);
  logInfo("Contract addresses:");
  Object.entries(filteredAddresses).forEach(([name, address]) => {
    logInfo(`  ${name}: ${address}`);
  });

  return filteredAddresses;
}

function verifyContracts(network, addresses) {
  logStep(`Verifying contracts on ${network.blockscoutUrl}`);

  const contractsDir = path.join(projectRoot, "contracts");
  let successCount = 0;
  let failCount = 0;

  for (const [contractName, address] of Object.entries(addresses)) {
    if (address && address !== "0x0000000000000000000000000000000000000000") {
      try {
        logInfo(`Verifying ${contractName} at ${address}`);

        // Determine contract path based on contract name
        let contractPath = `src/${contractName}.sol`;
        if (contractName === "MockUSDC" || contractName === "MockCompound") {
          contractPath = `src/mocks/${contractName}.sol`;
        }

        // Get constructor arguments if needed
        let constructorArgs = "";
        if (contractName === "DepositManager") {
          constructorArgs = `--constructor-args $(cast abi-encode "constructor(address,address,address)" ${
            addresses.MockUSDC || addresses.USDC
          } ${addresses.PlatformToken} ${addresses.MockCompound || addresses.CUSDC})`;
        } else if (contractName === "MockCompound") {
          constructorArgs = `--constructor-args $(cast abi-encode "constructor(address)" ${addresses.MockUSDC})`;
        }

        // Use Blockscout verifier
        const verifyCommand = `forge verify-contract ${address} ${contractPath}:${contractName} --verifier blockscout --verifier-url ${network.blockscoutApiUrl} ${constructorArgs}`;

        try {
          runCommand(verifyCommand, contractsDir);
          logSuccess(`Verified ${contractName}`);
          successCount++;
        } catch (error) {
          logWarning(`Failed to verify ${contractName}: ${error.message}`);
          failCount++;
        }
      } catch (error) {
        logWarning(`Skipping verification for ${contractName}: ${error.message}`);
        failCount++;
      }
    }
  }

  return { successCount, failCount };
}

function main() {
  const args = process.argv.slice(2);
  const networkArg = args[0] || "sepolia";

  if (!NETWORKS[networkArg]) {
    logError(`Invalid network: ${networkArg}`);
    logError(`Supported networks: ${Object.keys(NETWORKS).join(", ")}`);
    process.exit(1);
  }

  const network = NETWORKS[networkArg];

  log(
    `${colors.bright}${colors.magenta}🔍 Starting contract verification on ${network.name}${colors.reset}`
  );

  try {
    // Load contract addresses from config
    const addresses = loadContractAddresses(network);

    if (Object.keys(addresses).length === 0) {
      logError("No contract addresses found to verify");
      process.exit(1);
    }

    // Verify contracts
    const { successCount, failCount } = verifyContracts(network, addresses);

    logStep("Verification Summary");
    logInfo(`Chain ID: ${network.chainId}`);
    logInfo(`Explorer: ${network.explorerUrl}`);
    logSuccess(`Successfully verified: ${successCount} contract(s)`);
    if (failCount > 0) {
      logWarning(`Failed to verify: ${failCount} contract(s)`);
    }

    if (successCount > 0) {
      logSuccess("🎉 Verification completed!");
    } else {
      logError("No contracts were successfully verified");
      process.exit(1);
    }
  } catch (error) {
    logError(`Verification failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
