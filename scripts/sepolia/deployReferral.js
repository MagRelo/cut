#!/usr/bin/env node
/**
 * Deploy only ReferralGraph + RewardCalculator on Base Sepolia (84532).
 * Uses `contracts/script/Deploy_sepolia_referral.s.sol`. Does not modify app config JSON.
 *
 * Prerequisites: `contracts/.env` with DEPLOYER_PK, BASE_SEPOLIA_RPC_URL, REFERRAL_GROUP_ID;
 * optional OPS_ORACLE_PK (oracle defaults to deployer if unset).
 *
 * Usage (from repo root):
 *   node scripts/sepolia/deployReferral.js
 *   pnpm run sepolia:deploy-referral
 */

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..", "..");
const contractsDir = path.join(projectRoot, "contracts");

dotenv.config({ path: path.join(contractsDir, ".env") });

const privateKey = process.env.DEPLOYER_PK;
const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;
const referralGroupId = process.env.REFERRAL_GROUP_ID?.trim();

if (!privateKey) {
  console.error("Missing DEPLOYER_PK (set in contracts/.env)");
  process.exit(1);
}
if (!rpcUrl) {
  console.error("Missing BASE_SEPOLIA_RPC_URL (set in contracts/.env)");
  process.exit(1);
}
if (!referralGroupId || !/^0x[0-9a-fA-F]{64}$/.test(referralGroupId.startsWith("0x") ? referralGroupId : `0x${referralGroupId}`)) {
  console.error("REFERRAL_GROUP_ID must be 32-byte hex (0x + 64 hex characters) in contracts/.env");
  process.exit(1);
}

const script = "Deploy_sepolia_referral.s.sol";
const cmd = `forge script script/${script} --rpc-url ${rpcUrl} --broadcast`;

console.log(`Contracts directory: ${contractsDir}`);
console.log(`Running: ${cmd}\n`);

execSync(cmd, { cwd: contractsDir, stdio: "inherit" });
