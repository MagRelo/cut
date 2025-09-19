#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");

// Configuration
const NETWORKS = {
  sepolia: {
    name: "base_sepolia",
    chainId: 84532,
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL,
    explorerUrl: "https://sepolia.basescan.org",
    script: "Deploy_sepolia.s.sol",
    verifyChain: "base-sepolia",
  },
  base: {
    name: "base",
    chainId: 8453,
    rpcUrl: process.env.BASE_RPC_URL,
    explorerUrl: "https://basescan.org",
    script: "Deploy.s.sol",
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

function parseDeploymentOutput(output) {
  const addresses = {};
  const lines = output.split("\n");

  for (const line of lines) {
    if (line.includes("deployed to:") || line.includes("deployed at:")) {
      // Handle different output formats
      let contractName, address;

      // Format: "ContractName deployed to: 0x..."
      const match1 = line.match(/(\w+)\s+deployed\s+(?:to|at):\s*(0x[a-fA-F0-9]{40})/);
      if (match1) {
        contractName = match1[1];
        address = match1[2];
      } else {
        // Format: "ContractName deployed to: 0x..." (alternative parsing)
        const parts = line.split("deployed");
        if (parts.length >= 2) {
          contractName = parts[0].trim();
          const addressPart = parts[1].split(":");
          if (addressPart.length >= 2) {
            address = addressPart[1].trim();
          }
        }
      }

      if (contractName && address) {
        addresses[contractName] = address;
        logInfo(`Parsed: ${contractName} -> ${address}`);
      }
    }
  }

  return addresses;
}

function updateConfigFiles(network, addresses) {
  logStep(`Updating configuration files for ${network.name}`);

  const config = {
    paymentTokenAddress: addresses.MockUSDC || addresses.USDC,
    platformTokenAddress: addresses.PlatformToken,
    depositManagerAddress: addresses.DepositManager,
    escrowFactoryAddress: addresses.EscrowFactory,
    mockCTokenAddress: addresses.MockCompound,
  };

  // Update client config
  const clientConfigPath = path.join(
    projectRoot,
    "client",
    "src",
    "utils",
    "contracts",
    `${network.name === "base_sepolia" ? "sepolia" : "base"}.json`
  );
  fs.writeFileSync(clientConfigPath, JSON.stringify(config, null, 2));
  logSuccess(`Updated client config: ${clientConfigPath}`);

  // Update server config
  const serverConfigPath = path.join(
    projectRoot,
    "server",
    "contracts",
    `${network.name === "base_sepolia" ? "sepolia" : "base"}.json`
  );
  fs.writeFileSync(serverConfigPath, JSON.stringify(config, null, 2));
  logSuccess(`Updated server config: ${serverConfigPath}`);

  return config;
}

function copyContractArtifacts() {
  logStep("Copying contract artifacts to server");

  const contractsOutDir = path.join(projectRoot, "contracts", "out");
  const serverContractsDir = path.join(projectRoot, "server", "contracts");

  // Ensure server contracts directory exists
  if (!fs.existsSync(serverContractsDir)) {
    fs.mkdirSync(serverContractsDir, { recursive: true });
  }

  // List of contracts to copy artifacts for
  const contractsToCopy = [
    "DepositManager",
    "EscrowFactory",
    "Escrow",
    "PlatformToken",
    "MockUSDC",
    "MockCompound",
  ];

  let copiedCount = 0;
  for (const contractName of contractsToCopy) {
    const artifactPath = path.join(contractsOutDir, `${contractName}.sol`, `${contractName}.json`);
    const destPath = path.join(serverContractsDir, `${contractName}.json`);

    if (fs.existsSync(artifactPath)) {
      try {
        fs.copyFileSync(artifactPath, destPath);
        logSuccess(`Copied ${contractName}.json`);
        copiedCount++;
      } catch (error) {
        logWarning(`Failed to copy ${contractName}.json: ${error.message}`);
      }
    } else {
      logWarning(`Artifact not found for ${contractName} at ${artifactPath}`);
    }
  }

  logSuccess(`Copied ${copiedCount} contract artifacts to server`);
}

function verifyContracts(network, addresses) {
  logStep(`Verifying contracts on ${network.explorerUrl}`);

  const contractsDir = path.join(projectRoot, "contracts");

  for (const [contractName, address] of Object.entries(addresses)) {
    if (address && address !== "0x0000000000000000000000000000000000000000") {
      try {
        logInfo(`Verifying ${contractName} at ${address}`);

        // Get constructor arguments if needed
        let constructorArgs = "";
        if (contractName === "DepositManager") {
          constructorArgs = `--constructor-args $(cast abi-encode "constructor(address,address,address)" ${
            addresses.MockUSDC || addresses.USDC
          } ${addresses.PlatformToken} ${addresses.MockCompound || addresses.CUSDC})`;
        }

        const verifyCommand = `forge verify-contract ${address} src/${contractName}.sol:${contractName} --chain ${network.verifyChain} --etherscan-api-key ${process.env.BASESCAN_API_KEY} ${constructorArgs}`;

        try {
          runCommand(verifyCommand, contractsDir);
          logSuccess(`Verified ${contractName}`);
        } catch (error) {
          logWarning(`Failed to verify ${contractName}: ${error.message}`);
        }
      } catch (error) {
        logWarning(`Skipping verification for ${contractName}: ${error.message}`);
      }
    }
  }
}

function checkEnvironment() {
  logStep("Checking environment variables");

  const requiredVars = ["PRIVATE_KEY", "BASESCAN_API_KEY"];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    logError(`Missing required environment variables: ${missingVars.join(", ")}`);
    logError("Please set these variables in your .env file or environment");
    process.exit(1);
  }

  logSuccess("Environment variables check passed");
}

function deployContracts(network) {
  logStep(`Deploying contracts to ${network.name}`);

  const contractsDir = path.join(projectRoot, "contracts");

  // Set network-specific environment variables
  if (network.name === "base_sepolia") {
    if (!process.env.BASE_SEPOLIA_RPC_URL) {
      logError("BASE_SEPOLIA_RPC_URL environment variable is required for sepolia deployment");
      process.exit(1);
    }
  } else if (network.name === "base") {
    if (!process.env.BASE_RPC_URL) {
      logError("BASE_RPC_URL environment variable is required for base deployment");
      process.exit(1);
    }
  }

  // Run deployment
  const deployCommand = `forge script script/${network.script} --rpc-url ${network.rpcUrl} --broadcast --verify`;
  const output = runCommand(deployCommand, contractsDir);

  // Parse deployment addresses
  const addresses = parseDeploymentOutput(output);

  if (Object.keys(addresses).length === 0) {
    logError("No contract addresses found in deployment output");
    process.exit(1);
  }

  logSuccess(`Deployed ${Object.keys(addresses).length} contracts`);
  logInfo("Deployed addresses:");
  Object.entries(addresses).forEach(([name, address]) => {
    logInfo(`  ${name}: ${address}`);
  });

  return addresses;
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

  log(`${colors.bright}${colors.magenta}🚀 Starting deployment to ${network.name}${colors.reset}`);

  try {
    // Check environment
    checkEnvironment();

    // Deploy contracts
    const addresses = deployContracts(network);

    // Update configuration files
    const config = updateConfigFiles(network, addresses);

    // Copy contract artifacts
    copyContractArtifacts();

    // Verify contracts
    verifyContracts(network, addresses);

    logStep("Deployment Summary");
    logSuccess(`Successfully deployed to ${network.name}`);
    logInfo(`Chain ID: ${network.chainId}`);
    logInfo(`Explorer: ${network.explorerUrl}`);
    logInfo("Contract addresses:");
    Object.entries(config).forEach(([key, value]) => {
      logInfo(`  ${key}: ${value}`);
    });

    logSuccess("🎉 Deployment completed successfully!");
  } catch (error) {
    logError(`Deployment failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
