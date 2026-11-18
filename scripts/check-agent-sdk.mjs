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
    console.error(`${relative(root, target)} is missing. Run pnpm run agent:release.`);
    process.exit(1);
  }
  if (!body.equals(expected)) {
    console.error(`${relative(root, target)} does not match ${label}. Run pnpm run agent:release.`);
    process.exit(1);
  }
}

const agentsSpec = readFileSync(specPath);
for (const { target, routeHref } of copies) {
  requireCopy(target, packagedAgents(agentsSpec, routeHref), "spec/agent/agents.md");
}
const api = readFileSync(apiSpecPath);
for (const { target, agentsHref } of apiCopies) {
  requireCopy(target, packagedApi(api, agentsHref), "spec/server/api.md");
}

const pkg = JSON.parse(readFileSync(`${packageDir}/package.json`, "utf8"));
const installManifestPath = `${packageDir}/package.install.json`;
let installPkg;
try {
  installPkg = JSON.parse(readFileSync(installManifestPath, "utf8"));
} catch {
  console.error(`${relative(root, installManifestPath)} is missing.`);
  process.exit(1);
}
if (installPkg.name !== pkg.name) {
  console.error("packages/agent/package.install.json name does not match package.json.");
  process.exit(1);
}
for (const field of ["dependencies", "devDependencies"]) {
  const same =
    JSON.stringify(installPkg[field] ?? {}, Object.keys(installPkg[field] ?? {}).sort()) ===
    JSON.stringify(pkg[field] ?? {}, Object.keys(pkg[field] ?? {}).sort());
  if (!same) {
    console.error(
      `packages/agent/package.install.json ${field} do not match package.json. The Docker install layer copies the install manifest.`,
    );
    process.exit(1);
  }
}
const release = JSON.parse(readFileSync(releasePath, "utf8"));
const hash = contentHash();
if (release.version !== pkg.version) {
  console.error(
    `release.json version ${release.version} does not match package version ${pkg.version}. Run pnpm run agent:stamp.`,
  );
  process.exit(1);
}
if (release.hash !== hash) {
  console.error("Agent spec or package source changed. Run pnpm run agent:stamp.");
  process.exit(1);
}
console.log(`@playthecut/agent@${pkg.version} matches the spec.`);
