import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { copies, specPath } from "./agent-sdk-lib.mjs";

const spec = readFileSync(specPath);
for (const target of copies) {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, spec);
}
console.log(`Copied spec/agent/agents.md to ${copies.length} paths.`);
