import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { packageDir, stampRelease, syncAgentDocs } from "./agent-sdk-lib.mjs";

const written = syncAgentDocs();
if (written.length === 0) {
  console.log("Agent docs already match. @playthecut/agent was not bumped.");
  process.exit(0);
}

console.log(`Copied agent docs:\n${written.join("\n")}`);

const pkgPath = join(packageDir, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(pkg.version);
if (!match) {
  console.error(`Cannot bump @playthecut/agent version ${pkg.version}.`);
  process.exit(1);
}
pkg.version = `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`Bumped @playthecut/agent to ${pkg.version}.`);

stampRelease();
console.log(`Stamped @playthecut/agent@${pkg.version}.`);
