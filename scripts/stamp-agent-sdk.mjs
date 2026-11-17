import { readFileSync, writeFileSync } from "node:fs";
import { contentHash, packageDir, releasePath } from "./agent-sdk-lib.mjs";

const pkg = JSON.parse(readFileSync(`${packageDir}/package.json`, "utf8"));
const hash = contentHash();
let previous = null;
try {
  previous = JSON.parse(readFileSync(releasePath, "utf8"));
} catch {
  previous = null;
}
if (previous && previous.version === pkg.version && previous.hash !== hash) {
  console.error("Bump packages/agent/package.json before restamping.");
  process.exit(1);
}
writeFileSync(releasePath, `${JSON.stringify({ version: pkg.version, hash }, null, 2)}\n`);
console.log(`Stamped @playthecut/agent@${pkg.version}.`);
