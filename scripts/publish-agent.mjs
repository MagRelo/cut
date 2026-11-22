import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  bumpLocalPackage,
  contentHash,
  decidePublish,
  findStageId,
  listStaged,
  loadNpmToken,
  packageDir,
  publishedVersions,
  readRelease,
  stageIdFromText,
  writeRelease,
} from "./agent-sdk-lib.mjs";

const pkg = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
const release = readRelease();
const hash = contentHash();
const token = loadNpmToken();
if (!token) {
  console.error(`NPM_TOKEN is required to publish ${pkg.name}@${pkg.version}.`);
  process.exit(1);
}

let published;
let stage;
try {
  published = await publishedVersions(pkg.name);
  stage = findStageId(listStaged(pkg.name, token), pkg.version);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const decision = decidePublish({
  version: pkg.version,
  hash,
  release,
  published: published.has(pkg.version),
  stageId: stage ? stage.id ?? pkg.version : "",
});
if (decision.action === "skip" && decision.reason === "published") {
  console.log(`${pkg.name}@${pkg.version} is already on npm.`);
  process.exit(0);
}
if (decision.action === "skip" && decision.reason === "staged") {
  console.log(`${pkg.name}@${pkg.version} is already staged.`);
  console.log(
    decision.id && decision.id !== pkg.version
      ? `Approve it with npm stage approve ${decision.id}.`
      : `Approve it from npm stage list ${pkg.name}.`,
  );
  process.exit(0);
}
if (decision.action === "bump") {
  console.error(
    `${pkg.name}@${pkg.version} is already staged. A source or doc change needs a new patch. Run pnpm run agent:release, then publish.`,
  );
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "cut-npm-"));
const userconfig = join(dir, "npmrc");
writeFileSync(userconfig, `//registry.npmjs.org/:_authToken=${token}\n`);

function runNpm(command) {
  return spawnSync(command[0], command.slice(1), {
    cwd: packageDir,
    encoding: "utf8",
  });
}

function echo(result) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

let result = runNpm(["npm", "publish", "--access", "public", "--userconfig", userconfig]);
const publishedDirectly = result.status === 0;
const stageOnly =
  !publishedDirectly && `${result.stdout ?? ""}${result.stderr ?? ""}`.includes("E_STAGE_REQUIRED");
if (publishedDirectly || !stageOnly) echo(result);
if (stageOnly) {
  console.log(
    `${pkg.name}@${pkg.version} needs a staged publish. A maintainer approves it before it is installable.`,
  );
  result = runNpm([
    "npx",
    "--yes",
    "npm@11",
    "stage",
    "publish",
    "--access",
    "public",
    "--userconfig",
    userconfig,
  ]);
  echo(result);
}
rmSync(dir, { recursive: true, force: true });
if (result.status !== 0) {
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (output.includes("Cannot stage previously published version")) {
    const next = bumpLocalPackage();
    console.error(
      `${pkg.name}@${pkg.version} is already used. Bumped to ${next}. Run pnpm run deploy again to stage it.`,
    );
  }
  process.exit(result.status ?? 1);
}
if (!publishedDirectly) {
  const stageId = stageIdFromText(`${result.stdout ?? ""}${result.stderr ?? ""}`);
  writeRelease(pkg.version, hash, {
    version: pkg.version,
    hash,
    ...(stageId ? { id: stageId } : {}),
  });
  console.log(
    stageId
      ? `Staged ${pkg.name}@${pkg.version}. Approve it with npm stage approve ${stageId}.`
      : `Staged ${pkg.name}@${pkg.version}. Approve it with npm stage list ${pkg.name}, then npm stage approve <id>.`,
  );
} else {
  console.log(`Published ${pkg.name}@${pkg.version}.`);
}
