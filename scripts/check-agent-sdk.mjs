import { readFileSync } from "node:fs";
import { relative } from "node:path";
import {
  apiCopies,
  apiSpecPath,
  contentHash,
  copies,
  packageDir,
  packagedAgents,
  packagedApi,
  releasePath,
  root,
  specPath,
} from "./agent-sdk-lib.mjs";

function requireCopy(target, expected, label) {
  let body;
  try {
    body = readFileSync(target);
  } catch {
    console.error(`${relative(root, target)} is missing. Run pnpm run agent:sync.`);
    process.exit(1);
  }
  if (!body.equals(expected)) {
    console.error(`${relative(root, target)} does not match ${label}. Run pnpm run agent:sync.`);
    process.exit(1);
  }
}

const agents = packagedAgents(readFileSync(specPath));
for (const target of copies) {
  requireCopy(target, agents, "spec/agent/agents.md");
}
const api = readFileSync(apiSpecPath);
for (const { target, agentsHref } of apiCopies) {
  requireCopy(target, packagedApi(api, agentsHref), "spec/server/api.md");
}

const pkg = JSON.parse(readFileSync(`${packageDir}/package.json`, "utf8"));
const release = JSON.parse(readFileSync(releasePath, "utf8"));
const hash = contentHash();
if (release.version !== pkg.version) {
  console.error(
    `release.json version ${release.version} does not match package version ${pkg.version}. Bump packages/agent and run pnpm run agent:stamp.`,
  );
  process.exit(1);
}
if (release.hash !== hash) {
  console.error(
    "Agent spec or package source changed without a version bump. Bump packages/agent/package.json and run pnpm run agent:stamp.",
  );
  process.exit(1);
}
console.log(`@playthecut/agent@${pkg.version} matches the spec.`);
