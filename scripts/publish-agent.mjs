import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { packageDir } from "./agent-sdk-lib.mjs";

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
const result = spawnSync("npm", ["publish", "--access", "public", "--userconfig", userconfig], {
  cwd: packageDir,
  stdio: "inherit",
});
rmSync(dir, { recursive: true, force: true });
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`Published ${pkg.name}@${pkg.version}.`);
