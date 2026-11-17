import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { packageDir, root } from "./agent-sdk-lib.mjs";

if (!process.env.NPM_TOKEN?.trim()) {
  const envPath = join(root, ".env");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1 || trimmed.slice(0, eq).trim() !== "NPM_TOKEN") continue;
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env.NPM_TOKEN = value;
    }
  }
}

const pkg = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));

function compare(left, right) {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    const delta = (a[index] ?? 0) - (b[index] ?? 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

const response = await fetch(`https://registry.npmjs.org/${pkg.name.replace("/", "%2f")}`);
if (response.status !== 404 && !response.ok) {
  console.error(`npm registry returned ${response.status} for ${pkg.name}.`);
  process.exit(1);
}
const published =
  response.status === 404 ? { versions: {}, "dist-tags": {} } : await response.json();
const versions = published.versions ?? {};
if (versions[pkg.version]) {
  console.log(`${pkg.name}@${pkg.version} is already on npm.`);
  process.exit(0);
}
const latest = published["dist-tags"]?.latest;
if (latest && compare(pkg.version, latest) < 0) {
  console.error(`${pkg.name}@${pkg.version} is behind npm latest ${latest}.`);
  process.exit(1);
}
const token = process.env.NPM_TOKEN?.trim();
if (!token) {
  console.error(`NPM_TOKEN is required to publish ${pkg.name}@${pkg.version}.`);
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "cut-npm-"));
const userconfig = join(dir, "npmrc");
writeFileSync(userconfig, `//registry.npmjs.org/:_authToken=${token}\n`);

function runNpm(command) {
  return spawnSync(command[0], command.slice(1), {
    cwd: packageDir,
    encoding: "utf8",
  });
}

function echo(result) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

let result = runNpm(["npm", "publish", "--access", "public", "--userconfig", userconfig]);
const publishedDirectly = result.status === 0;
const stageOnly =
  !publishedDirectly && `${result.stdout ?? ""}${result.stderr ?? ""}`.includes("E_STAGE_REQUIRED");
if (publishedDirectly || !stageOnly) echo(result);
if (stageOnly) {
  console.log(
    `${pkg.name}@${pkg.version} needs a staged publish. A maintainer approves it before it is installable.`,
  );
  result = runNpm([
    "npx",
    "--yes",
    "npm@11",
    "stage",
    "publish",
    "--access",
    "public",
    "--userconfig",
    userconfig,
  ]);
  echo(result);
}
rmSync(dir, { recursive: true, force: true });
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(
  publishedDirectly
    ? `Published ${pkg.name}@${pkg.version}.`
    : `Staged ${pkg.name}@${pkg.version}. Approve it with npm stage approve.`,
);
