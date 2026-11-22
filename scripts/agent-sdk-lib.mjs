import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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

const STAGE_ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function bumpPatch(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`Cannot bump @playthecut/agent version ${version}.`);
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

export function readRelease() {
  try {
    return JSON.parse(readFileSync(releasePath, "utf8"));
  } catch {
    return { version: "", hash: "" };
  }
}

export const agentReleasePaths = [
  "packages/agent/src",
  ":(exclude)packages/agent/src/**/*.test.ts",
  "spec/agent/agents.md",
  "spec/agent/access.md",
  "spec/server/api.md",
];

export function gitText(args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || "git failed").trim());
  }
  return result.stdout.trim();
}

export function releaseGit() {
  return gitText(["rev-parse", "HEAD"]);
}

export function parseCommits(text) {
  if (!text.trim()) return [];
  return text.split("\n").map((line) => {
    const [sha, short, ...subject] = line.split("\t");
    return { sha, short, subject: subject.join("\t") };
  });
}

export function selectCommits(commits, agentShas) {
  const agent = [];
  const other = [];
  for (const commit of commits) {
    (agentShas.has(commit.sha) ? agent : other).push(commit);
  }
  return { agent, other };
}

export function writeRelease(version, hash, staged) {
  const body = { version, hash, git: releaseGit() };
  if (staged) body.staged = staged;
  writeFileSync(releasePath, `${JSON.stringify(body, null, 2)}\n`);
  return body;
}

export function stageIdFromText(text) {
  return text.match(STAGE_ID)?.[0] ?? "";
}

export function bumpLocalPackage() {
  const pkgPath = join(packageDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const version = bumpPatch(pkg.version);
  pkg.version = version;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  writeRelease(version, contentHash());
  return version;
}

export function stampRelease() {
  const pkg = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
  const previous = readRelease();
  const hash = contentHash();
  const staged =
    previous.staged?.version === pkg.version && previous.staged?.hash === hash
      ? previous.staged
      : undefined;
  return writeRelease(pkg.version, hash, staged);
}

/** A version already on npm, or already waiting in the stage list, cannot be staged again. */
export function decideRelease({ version, hash, release, published, staged, copiesWritten }) {
  const stampMatches = release.version === version && release.hash === hash;
  const stagedMatches =
    staged && release.staged?.version === version && release.staged?.hash === hash;
  const shipped = stampMatches && (published || stagedMatches);
  if ((published || staged) && (!shipped || copiesWritten)) {
    return { version: bumpPatch(version), bump: true, stamp: true };
  }
  if (!stampMatches || copiesWritten) return { version, bump: false, stamp: true };
  return { version, bump: false, stamp: false };
}

export function decidePublish({ version, hash, release, published, stageId }) {
  if (published) return { action: "skip", reason: "published" };
  if (stageId) {
    if (release.staged?.version === version && release.staged?.hash === hash) {
      return { action: "skip", reason: "staged", id: stageId };
    }
    return { action: "bump", reason: "staged", id: stageId };
  }
  return { action: "stage" };
}

export function findStageId(payload, version) {
  let found = null;
  const visit = (node) => {
    if (found || node == null) return;
    if (typeof node === "string") {
      const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const mentions =
        node === version ||
        new RegExp(`@${escaped}(?!\\d)`).test(node) ||
        node.includes(`"version":"${version}"`) ||
        node.includes(`"version": "${version}"`);
      if (mentions) found = { id: node.match(STAGE_ID)?.[0] ?? null };
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (typeof node !== "object") return;
    const entryVersion = typeof node.version === "string" ? node.version : node.package?.version;
    if (entryVersion === version) {
      const id = [node.id, node.stageId, node.stage_id, node.uuid].find(
        (value) => typeof value === "string" && STAGE_ID.test(value),
      );
      found = { id: id ?? null };
      return;
    }
    for (const value of Object.values(node)) visit(value);
  };
  visit(payload);
  return found;
}

export function loadNpmToken() {
  if (process.env.NPM_TOKEN?.trim()) return process.env.NPM_TOKEN.trim();
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return "";
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
    return value.trim();
  }
  return "";
}

function npmUserconfig(token) {
  return `//registry.npmjs.org/:_authToken=${token}\n`;
}

async function packument(name) {
  const response = await fetch(`https://registry.npmjs.org/${name.replace("/", "%2f")}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`npm registry returned ${response.status} for ${name}.`);
  return response.json();
}

export async function publishedVersions(name) {
  const body = await packument(name);
  return new Set(Object.keys(body?.versions ?? {}));
}

export async function latestPublished(name) {
  const body = await packument(name);
  const version = body?.["dist-tags"]?.latest ?? "";
  if (!version) return null;
  return { version, git: body.versions?.[version]?.gitHead ?? "" };
}

export function listStaged(name, token) {
  const dir = mkdtempSync(join(tmpdir(), "cut-npm-"));
  const userconfig = join(dir, "npmrc");
  writeFileSync(userconfig, npmUserconfig(token));
  try {
    const result = spawnSync(
      "npx",
      ["--yes", "npm@11", "stage", "list", name, "--json", "--userconfig", userconfig],
      { encoding: "utf8" },
    );
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    if (result.status !== 0) {
      throw new Error(output.trim() || `npm stage list failed for ${name}.`);
    }
    const stdout = result.stdout ?? "";
    const starts = [stdout.indexOf("{"), stdout.indexOf("[")].filter((index) => index >= 0);
    const jsonStart = starts.length > 0 ? Math.min(...starts) : -1;
    const jsonText = jsonStart >= 0 ? stdout.slice(jsonStart) : stdout;
    try {
      return JSON.parse(jsonText);
    } catch {
      return result.stdout ?? "";
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export async function prepareAgentRelease() {
  const written = syncAgentDocs();
  const pkgPath = join(packageDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const hash = contentHash();
  const release = readRelease();
  const token = loadNpmToken();
  if (!token) throw new Error("NPM_TOKEN is required to check staged versions.");
  const published = await publishedVersions(pkg.name);
  const staged = findStageId(listStaged(pkg.name, token), pkg.version);
  const decision = decideRelease({
    version: pkg.version,
    hash,
    release,
    published: published.has(pkg.version),
    staged: Boolean(staged),
    copiesWritten: written.length > 0,
  });
  if (decision.bump) {
    pkg.version = decision.version;
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  }
  if (decision.stamp || decision.bump) {
    const stagedRecord =
      !decision.bump && release.staged?.version === pkg.version && release.staged?.hash === hash
        ? release.staged
        : undefined;
    writeRelease(pkg.version, contentHash(), stagedRecord);
  }
  return {
    ...decision,
    written,
    name: pkg.name,
    published: published.has(pkg.version),
    staged: Boolean(staged),
    stageId: staged?.id ?? "",
  };
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
