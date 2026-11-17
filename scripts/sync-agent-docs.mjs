import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  apiCopies,
  apiSpecPath,
  copies,
  packagedAgents,
  packagedApi,
  specPath,
} from "./agent-sdk-lib.mjs";

const agents = packagedAgents(readFileSync(specPath));
for (const target of copies) {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, agents);
}

const api = readFileSync(apiSpecPath);
for (const { target, agentsHref } of apiCopies) {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, packagedApi(api, agentsHref));
}
console.log(`Copied agent docs to ${copies.length + apiCopies.length} paths.`);
