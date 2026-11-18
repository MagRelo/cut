import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const specPath = join(root, "spec/agent/agents.md");
export const accessSpecPath = join(root, "spec/agent/access.md");
export const apiSpecPath = join(root, "spec/server/api.md");
export const packageDir = join(root, "packages/agent");
export const releasePath = join(packageDir, "release.json");

const repoRouteLink = "[spec/server/api.md](../server/api.md)";
const repoAgentsLink = "[spec/agent/agents.md](../agent/agents.md)";
const accessRouteLink = "[spec/server/api.md](../server/api.md)";

/** Package README links into docs/. The other agents pages sit beside api.md. */
export const copies = [
  { target: join(packageDir, "README.md"), routeHref: "docs/api.md", accessHref: "docs/access.md" },
  { target: join(packageDir, "docs/agents.md"), routeHref: "api.md", accessHref: "access.md" },
  { target: join(root, "client/public/agents.md"), routeHref: "api.md", accessHref: "access.md" },
];

export const accessCopies = [
  { target: join(packageDir, "docs/access.md"), routeHref: "api.md" },
  { target: join(root, "client/public/access.md"), routeHref: "api.md" },
];

export const apiCopies = [
  { target: join(packageDir, "docs/api.md"), agentsHref: "agents.md" },
  { target: join(root, "client/public/api.md"), agentsHref: "agents.md" },
];

export function packagedAgents(spec, routeHref, accessHref = "access.md") {
  const text = spec.toString("utf8");
  if (!text.includes(repoRouteLink)) {
    throw new Error("spec/agent/agents.md is missing the link to spec/server/api.md");
  }
  return Buffer.from(
    text
      .replaceAll(repoRouteLink, `[${routeHref}](${routeHref})`)
      .replaceAll("](access.md#", `](${accessHref}#`)
      .replaceAll("](access.md)", `](${accessHref})`),
  );
}

export function packagedAccess(spec, routeHref) {
  const text = spec.toString("utf8");
  if (!text.includes(accessRouteLink)) {
    throw new Error("spec/agent/access.md is missing the link to spec/server/api.md");
  }
  return Buffer.from(text.replaceAll(accessRouteLink, `[${routeHref}](${routeHref})`));
}

export function writeIfChanged(target, body) {
  const next = Buffer.isBuffer(body) ? body : Buffer.from(body);
  if (existsSync(target) && readFileSync(target).equals(next)) return false;
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, next);
  return true;
}

/** Copy the agent pages. Returns repo-relative paths that were written. */
export function syncAgentDocs() {
  const written = [];
  const agentsSpec = readFileSync(specPath);
  for (const { target, routeHref, accessHref } of copies) {
    if (writeIfChanged(target, packagedAgents(agentsSpec, routeHref, accessHref))) {
      written.push(relative(root, target));
    }
  }
  const accessSpec = readFileSync(accessSpecPath);
  for (const { target, routeHref } of accessCopies) {
    if (writeIfChanged(target, packagedAccess(accessSpec, routeHref))) {
      written.push(relative(root, target));
    }
  }
  const api = readFileSync(apiSpecPath);
  for (const { target, agentsHref } of apiCopies) {
    if (writeIfChanged(target, packagedApi(api, agentsHref))) {
      written.push(relative(root, target));
    }
  }
  return written;
}

export function stampRelease() {
  const pkg = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
  const hash = contentHash();
  writeFileSync(releasePath, `${JSON.stringify({ version: pkg.version, hash }, null, 2)}\n`);
  return { version: pkg.version, hash };
}

export function packagedApi(spec, agentsHref) {
  const text = spec.toString("utf8");
  if (!text.includes(repoAgentsLink)) {
    throw new Error("spec/server/api.md is missing the link to spec/agent/agents.md");
  }
  return Buffer.from(text.replaceAll(repoAgentsLink, `[${agentsHref}](${agentsHref})`));
}

function sourceFiles(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...sourceFiles(path));
    else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) found.push(path);
  }
  return found;
}

export function contentHash() {
  const hash = createHash("sha256");
  const files = [specPath, accessSpecPath, apiSpecPath, ...sourceFiles(join(packageDir, "src"))].sort();
  for (const file of files) {
    hash.update(relative(root, file).split("\\").join("/"));
    hash.update("\0");
    hash.update(readFileSync(file));
    hash.update("\0");
  }
  return hash.digest("hex");
}
