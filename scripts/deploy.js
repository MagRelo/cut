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
    script: "Deploy_sepolia.s.sol",
    verifyChain: "base-sepolia",
  },
  base: {
    name: "base",
    chainId: 8453,
    rpcUrl: process.env.BASE_RPC_URL,
    explorerUrl: "https://basescan.org",
    blockscoutUrl: "https://base.blockscout.com",
    blockscoutApiUrl: "https://base.blockscout.com/api",
    script: "Deploy_base.s.sol",
    verifyChain: "base",
  },
};

const BASE_MAINNET_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_MAINNET_AAVE_V3_POOL = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5";
/** Base Sepolia: AaveV3BaseSepolia (bgd-labs/aave-address-book) */
const BASE_SEPOLIA_USDC = "0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f";
const BASE_SEPOLIA_AAVE_POOL = "0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27";

/**
 * ABIs copied to client + server after `forge build`. Matches contracts deployed by
 * `Deploy_sepolia.s.sol` and `Deploy_base.s.sol`, plus `ContestController` (instances are created
 * via ContestFactory; not deployed in those root scripts).
 *
 * Deploy_sepolia: MockUSDC, PlatformToken, DepositManager, ContestFactory, ReferralGraph, RewardDistributor
 * Deploy_base: PlatformToken, DepositManager, ContestFactory, ReferralGraph, RewardDistributor
 */
const ARTIFACT_COPY = [
  { dir: "MockUSDC.sol", file: "MockUSDC.json", dest: "MockUSDC.json" },
  { dir: "DepositManager.sol", file: "DepositManager.json", dest: "DepositManager.json" },
  { dir: "ContestFactory.sol", file: "ContestFactory.json", dest: "ContestFactory.json" },
  { dir: "ContestController.sol", file: "ContestController.json", dest: "ContestController.json" },
  { dir: "PlatformToken.sol", file: "PlatformToken.json", dest: "PlatformToken.json" },
  { dir: "ReferralGraph.sol", file: "ReferralGraph.json", dest: "ReferralGraph.json" },
  { dir: "RewardDistributor.sol", file: "RewardDistributor.json", dest: "RewardDistributor.json" },
];

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

function parseDeploymentOutput(output) {
  const addresses = {};
  const lines = output.split("\n");

  for (const line of lines) {
    if (!line.includes("deployed to:") && !line.includes("deployed at:")) continue;

    const match = line.match(/(\w+)\s+deployed\s+(?:to|at):\s*(0x[a-fA-F0-9]{40})/);
    if (match) {
      addresses[match[1]] = match[2];
      logInfo(`Parsed: ${match[1]} -> ${match[2]}`);
    }
  }

  return addresses;
}

function updateConfigFiles(network, addresses) {
  logStep(`Updating configuration files for ${network.name}`);

  const isBase = network.name === "base";
  const isSepolia = network.name === "base_sepolia";

  const paymentTokenAddress = isSepolia
    ? addresses.MockUSDC
    : isBase
      ? BASE_MAINNET_USDC
      : addresses.USDC;

  const aavePoolAddress = isSepolia
    ? BASE_SEPOLIA_AAVE_POOL
    : isBase
      ? BASE_MAINNET_AAVE_V3_POOL
      : undefined;

  const config = {
    paymentTokenAddress,
    platformTokenAddress: addresses.PlatformToken,
    depositManagerAddress: addresses.DepositManager,
    contestFactoryAddress: addresses.ContestFactory,
    aavePoolAddress,
    referralGraphAddress: addresses.ReferralGraph,
    rewardDistributorAddress: addresses.RewardDistributor,
  };

  const clientConfigPath = path.join(
    projectRoot,
    "client",
    "src",
    "utils",
    "contracts",
    `${network.name === "base_sepolia" ? "sepolia" : "base"}.json`,
  );
  fs.writeFileSync(clientConfigPath, JSON.stringify(config, null, 2));
  logSuccess(`Updated client config: ${clientConfigPath}`);

  const serverConfigPath = path.join(
    projectRoot,
    "server",
    "src",
    "contracts",
    `${network.name === "base_sepolia" ? "sepolia" : "base"}.json`,
  );
  fs.writeFileSync(serverConfigPath, JSON.stringify(config, null, 2));
  logSuccess(`Updated server config: ${serverConfigPath}`);

  return config;
}

function copyContractArtifacts() {
  logStep("Copying contract artifacts to server and client");

  const contractsOutDir = path.join(projectRoot, "contracts", "out");
  const serverContractsDir = path.join(projectRoot, "server", "src", "contracts");
  const clientContractsDir = path.join(projectRoot, "client", "src", "utils", "contracts");

  if (!fs.existsSync(serverContractsDir)) {
    fs.mkdirSync(serverContractsDir, { recursive: true });
  }
  if (!fs.existsSync(clientContractsDir)) {
    fs.mkdirSync(clientContractsDir, { recursive: true });
  }

  let serverCopiedCount = 0;
  let clientCopiedCount = 0;

  for (const { dir, file, dest } of ARTIFACT_COPY) {
    const artifactPath = path.join(contractsOutDir, dir, file);
    const serverDestPath = path.join(serverContractsDir, dest);
    const clientDestPath = path.join(clientContractsDir, dest);

    if (!fs.existsSync(artifactPath)) {
      logWarning(`Artifact not found (skip): ${artifactPath}`);
      continue;
    }

    try {
      fs.copyFileSync(artifactPath, serverDestPath);
      logSuccess(`Copied ${dest} to server`);
      serverCopiedCount++;
    } catch (error) {
      logWarning(`Failed to copy ${dest} to server: ${error.message}`);
    }

    try {
      fs.copyFileSync(artifactPath, clientDestPath);
      logSuccess(`Copied ${dest} to client`);
      clientCopiedCount++;
    } catch (error) {
      logWarning(`Failed to copy ${dest} to client: ${error.message}`);
    }
  }

  logSuccess(`Copied ${serverCopiedCount} contract artifacts to server`);
  logSuccess(`Copied ${clientCopiedCount} contract artifacts to client`);
}

function buildVerifyCommand(network, contractName, address, addresses) {
  const contractsDir = path.join(projectRoot, "contracts");
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
    } catch (error) {
      logWarning(`Failed to verify ${contractName}: ${error.message}`);
    }
  }
}

function checkEnvironment() {
  logStep("Checking environment variables");

  const requiredVars = ["PRIVATE_KEY"];

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

  const deployCommand = `forge script script/${network.script} --rpc-url ${network.rpcUrl} --broadcast`;
  const output = runCommand(deployCommand, contractsDir);

  const addresses = parseDeploymentOutput(output);

  if (Object.keys(addresses).length === 0) {
    logError("No contract addresses found in deployment output");
    process.exit(1);
  }

  if (network.name === "base_sepolia" && !addresses.MockUSDC) {
    logError("Sepolia deploy must include MockUSDC (check script logs for MockUSDC deployed to:)");
    process.exit(1);
  }

  logSuccess(`Deployed ${Object.keys(addresses).length} contracts`);
  logInfo("Deployed addresses:");
  Object.entries(addresses).forEach(([name, addr]) => {
    logInfo(`  ${name}: ${addr}`);
  });

  return addresses;
}

/** `forge build` + copy ABIs only (no deploy). Usage: `node scripts/deploy.js copy-artifacts` */
function copyArtifactsOnly() {
  const contractsDir = path.join(projectRoot, "contracts");
  logStep("copy-artifacts: forge build + copy ABIs to client and server");
  runCommand("forge build", contractsDir);
  copyContractArtifacts();
  logSuccess("copy-artifacts finished");
}

function main() {
  const args = process.argv.slice(2);
  if (args[0] === "copy-artifacts") {
    try {
      copyArtifactsOnly();
    } catch (error) {
      logError(`copy-artifacts failed: ${error.message}`);
      process.exit(1);
    }
    return;
  }

  const networkArg = args[0] || "sepolia";

  if (!NETWORKS[networkArg]) {
    logError(`Invalid network: ${networkArg}`);
    logError(`Supported networks: ${Object.keys(NETWORKS).join(", ")}, copy-artifacts`);
    process.exit(1);
  }

  const network = NETWORKS[networkArg];

  log(`${colors.bright}${colors.magenta}🚀 Starting deployment to ${network.name}${colors.reset}`);

  try {
    checkEnvironment();

    const addresses = deployContracts(network);

    const config = updateConfigFiles(network, addresses);

    copyContractArtifacts();

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

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
