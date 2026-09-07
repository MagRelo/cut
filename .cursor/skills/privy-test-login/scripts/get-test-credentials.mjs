#!/usr/bin/env node
/**
 * Fetch Privy test-account email + static OTP.
 *
 * Usage (from repo root or anywhere):
 *   node .cursor/skills/privy-test-login/scripts/get-test-credentials.mjs
 *
 * Reads PRIVY_APP_ID / PRIVY_APP_SECRET from the environment, then server/.env.
 * Prints JSON: { "email": "...", "otpCode": "......" }
 */
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PRIVY_API = "https://api.privy.io";

function parseEnvFile(text) {
  const out = {};
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

async function findRepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 8; i++) {
    try {
      await readFile(join(dir, "pnpm-workspace.yaml"), "utf8");
      return dir;
    } catch {
      const parent = resolve(dir, "..");
      if (parent === dir) break;
      dir = parent;
    }
  }
  return process.cwd();
}

async function loadPrivyEnv() {
  const appId = process.env.PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (appId && appSecret) return { appId, appSecret };

  const here = dirname(fileURLToPath(import.meta.url));
  const root = await findRepoRoot(here);
  const envPath = join(root, "server", ".env");
  let fileEnv = {};
  try {
    fileEnv = parseEnvFile(await readFile(envPath, "utf8"));
  } catch {
    throw new Error(
      `PRIVY_APP_ID / PRIVY_APP_SECRET are unset, and ${envPath} could not be read.`,
    );
  }
  const fromFileId = fileEnv.PRIVY_APP_ID;
  const fromFileSecret = fileEnv.PRIVY_APP_SECRET;
  if (!fromFileId || !fromFileSecret) {
    throw new Error(`PRIVY_APP_ID and PRIVY_APP_SECRET must be set in ${envPath}.`);
  }
  return { appId: fromFileId, appSecret: fromFileSecret };
}

function firstAccount(payload) {
  const list = payload?.data ?? payload?.test_accounts ?? payload;
  const accounts = Array.isArray(list) ? list : [];
  const account = accounts[0];
  if (!account?.email || !account?.otp_code) {
    throw new Error(
      "No Privy test accounts returned. Enable test accounts in the Privy Dashboard (User management → Authentication → Advanced).",
    );
  }
  return { email: account.email, otpCode: account.otp_code };
}

async function main() {
  const { appId, appSecret } = await loadPrivyEnv();
  const basic = Buffer.from(`${appId}:${appSecret}`).toString("base64");
  const res = await fetch(`${PRIVY_API}/v1/apps/${appId}/test_credentials`, {
    headers: {
      Authorization: `Basic ${basic}`,
      "privy-app-id": appId,
      "Content-Type": "application/json",
    },
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Privy test_credentials failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const creds = firstAccount(JSON.parse(body));
  process.stdout.write(`${JSON.stringify(creds)}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
