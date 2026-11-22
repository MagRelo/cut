import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  agentReleasePaths,
  gitText,
  latestPublished,
  packageDir,
  parseCommits,
  readRelease,
  selectCommits,
} from "./agent-sdk-lib.mjs";

const pkg = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
const release = readRelease();

let latest;
try {
  latest = await latestPublished(pkg.name);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
if (!latest?.git) {
  console.error(`${pkg.name} has no published commit to compare.`);
  process.exit(1);
}

let commits;
let agentShas;
try {
  gitText(["cat-file", "-e", `${latest.git}^{commit}`]);
  commits = parseCommits(gitText(["log", "--format=%H%x09%h%x09%s", `${latest.git}..HEAD`]));
  const agentText = gitText(["log", "--format=%H", `${latest.git}..HEAD`, "--", ...agentReleasePaths]);
  agentShas = new Set(agentText ? agentText.split("\n") : []);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const { agent, other } = selectCommits(commits, agentShas);
const short = latest.git.slice(0, 8);
console.log(`${pkg.name}@${latest.version} is the last release, cut at ${short}.`);

function printCommits(lines) {
  for (const commit of lines) console.log(`${commit.short} ${commit.subject}`);
}

console.log("");
if (agent.length === 0) {
  console.log("No agent changes since that release.");
} else {
  console.log("Agent changes since that release:");
  printCommits(agent);
}
console.log("");
if (other.length === 0) {
  console.log("No other commits since that release.");
} else {
  console.log("Other commits since that release:");
  printCommits(other);
}

if (pkg.version !== latest.version) {
  console.log("");
  console.log(
    release.git
      ? `${pkg.name}@${pkg.version} is the candidate, cut at ${release.git.slice(0, 8)}.`
      : `${pkg.name}@${pkg.version} is the candidate. Its commit is recorded on the next stamp.`,
  );
}

let dirty = "";
try {
  dirty = gitText(["status", "--porcelain", "--", ...agentReleasePaths]);
} catch {
  dirty = "";
}
if (dirty) {
  console.log("");
  console.log("Uncommitted agent changes:");
  console.log(dirty);
}
