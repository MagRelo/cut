#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");

dotenv.config({ path: path.join(projectRoot, "contracts", ".env") });

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

const BASE_MAINNET_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_MAINNET_AAVE_V3_POOL = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5";
const BASE_SEPOLIA_USDC = "0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f";
const BASE_SEPOLIA_AAVE_POOL = "0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27";

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

function runCommand(command, cwd = projectRoot) {
  try {
    logInfo(`Running: ${command}`);
    const output = execSync(command, {
      cwd,
      stdio: "pipe",
      encoding: "utf8",
      shell: true,
    });
    return output.trim();
  } catch (error) {
    logError(`Command failed: ${command}`);
    logError(`Error: ${error.message}`);
    throw error;
  }
}

function getDeployerAddress() {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) return null;
  try {
    return execSync(`cast wallet address ${pk}`, {
      cwd: path.join(projectRoot, "contracts"),
      encoding: "utf8",
      shell: true,
    }).trim();
  } catch {
    return null;
  }
}

function getReferralOracleAddress() {
  const o = process.env.REFERRAL_ORACLE;
  if (!o || o === "") return "0x0000000000000000000000000000000000000000";
  return o;
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

  const addresses = {
    PlatformToken: config.platformTokenAddress,
    DepositManager: config.depositManagerAddress,
    ContestFactory: config.contestFactoryAddress,
    ReferralGraph: config.referralGraphAddress,
    RewardDistributor: config.rewardDistributorAddress,
  };

  if (network.name === "base_sepolia" && config.paymentTokenAddress) {
    addresses.MockUSDC = config.paymentTokenAddress;
  }

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

function buildVerifyCommand(network, contractName, address, addresses) {
  const deployer = getDeployerAddress();
  const referralOracle = getReferralOracleAddress();

  const paths = {
    MockUSDC: "src/mocks/MockUSDC.sol",
    PlatformToken: "lib/yieldToken/src/PlatformToken.sol",
    DepositManager: "lib/yieldToken/src/DepositManager.sol",
    ContestFactory: "lib/contestCatalyst/src/ContestFactory.sol",
    ReferralGraph: "lib/referralTree/src/core/ReferralGraph.sol",
    RewardDistributor: "lib/referralTree/src/core/RewardDistributor.sol",
  };

  const contractPath = paths[contractName];
  if (!contractPath) return null;

  let constructorArgs = "";
  if (contractName === "MockUSDC") {
    return `forge verify-contract ${address} ${contractPath}:MockUSDC --verifier blockscout --verifier-url ${network.blockscoutApiUrl}`;
  }
  if (contractName === "DepositManager") {
    let usdc;
    let pool;
    if (network.name === "base_sepolia") {
      usdc = addresses.MockUSDC;
      pool = BASE_SEPOLIA_AAVE_POOL;
    } else if (network.name === "base") {
      usdc = BASE_MAINNET_USDC;
      pool = BASE_MAINNET_AAVE_V3_POOL;
    } else {
      usdc = addresses.USDC;
      pool = addresses.Pool;
    }
    constructorArgs = `--constructor-args $(cast abi-encode "constructor(address,address,address)" ${usdc} ${addresses.PlatformToken} ${pool})`;
  } else if (contractName === "PlatformToken") {
    const isSepolia = network.name === "base_sepolia";
    const name = isSepolia ? "xCUT" : "Cut Platform Token";
    const sym = isSepolia ? "xCUT" : "CUT";
    constructorArgs = `--constructor-args $(cast abi-encode "constructor(string,string)" "${name}" "${sym}")`;
  } else if (contractName === "ReferralGraph" && deployer) {
    constructorArgs = `--constructor-args $(cast abi-encode "constructor(address,address)" ${deployer} ${referralOracle})`;
  } else if (contractName === "RewardDistributor" && deployer && addresses.ReferralGraph) {
    constructorArgs = `--constructor-args $(cast abi-encode "constructor(address,address,address)" ${deployer} ${addresses.ReferralGraph} ${referralOracle})`;
  }

  return `forge verify-contract ${address} ${contractPath}:${contractName} --verifier blockscout --verifier-url ${network.blockscoutApiUrl} ${constructorArgs}`;
}

function verifyContracts(network, addresses) {
  logStep(`Verifying contracts on ${network.blockscoutUrl}`);

  const contractsDir = path.join(projectRoot, "contracts");
  let successCount = 0;
  let failCount = 0;

  const order = [
    "MockUSDC",
    "PlatformToken",
    "DepositManager",
    "ContestFactory",
    "ReferralGraph",
    "RewardDistributor",
  ];

  for (const contractName of order) {
    const address = addresses[contractName];
    if (!address || address === "0x0000000000000000000000000000000000000000") continue;

    const cmd = buildVerifyCommand(network, contractName, address, addresses);
    if (!cmd) {
      logWarning(`No verify mapping for ${contractName}, skipping`);
      continue;
    }

    try {
      logInfo(`Verifying ${contractName} at ${address}`);
      runCommand(cmd, contractsDir);
      logSuccess(`Verified ${contractName}`);
      successCount++;
    } catch (error) {
      logWarning(`Failed to verify ${contractName}: ${error.message}`);
      failCount++;
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
    const addresses = loadContractAddresses(network);

    if (Object.keys(addresses).length === 0) {
      logError("No contract addresses found to verify");
      process.exit(1);
    }

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

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
