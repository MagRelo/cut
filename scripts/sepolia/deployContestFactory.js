#!/usr/bin/env node
/**
 * Deploy only ContestFactory on Base Sepolia (84532).
 * Uses `contracts/script/Deploy_sepolia_contest_factory.s.sol`. Does not modify app config JSON.
 *
 * Prerequisites: `contracts/.env` with PRIVATE_KEY and BASE_SEPOLIA_RPC_URL; Foundry (`forge`).
 *
 * Usage (from repo root):
 *   node scripts/sepolia/deployContestFactory.js
 *   pnpm run sepolia:deploy-contest-factory
 */

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..", "..");
const contractsDir = path.join(projectRoot, "contracts");

dotenv.config({ path: path.join(contractsDir, ".env") });

const privateKey = process.env.PRIVATE_KEY;
const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;

if (!privateKey) {
  console.error("Missing PRIVATE_KEY (set in contracts/.env)");
  process.exit(1);
}
if (!rpcUrl) {
  console.error("Missing BASE_SEPOLIA_RPC_URL (set in contracts/.env)");
  process.exit(1);
}

const script = "Deploy_sepolia_contest_factory.s.sol";
const cmd = `forge script script/${script} --rpc-url ${rpcUrl} --broadcast`;

console.log(`Contracts directory: ${contractsDir}`);
console.log(`Running: ${cmd}\n`);

execSync(cmd, { cwd: contractsDir, stdio: "inherit" });
