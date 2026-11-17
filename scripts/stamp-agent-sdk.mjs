import { readFileSync, writeFileSync } from "node:fs";
import { contentHash, packageDir, releasePath } from "./agent-sdk-lib.mjs";

const pkg = JSON.parse(readFileSync(`${packageDir}/package.json`, "utf8"));
const hash = contentHash();
writeFileSync(releasePath, `${JSON.stringify({ version: pkg.version, hash }, null, 2)}\n`);
console.log(`Stamped @playthecut/agent@${pkg.version}.`);
