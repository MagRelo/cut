import assert from "node:assert/strict";
import test from "node:test";
import {
  decidePublish,
  decideRelease,
  findStageId,
  installManifest,
  parseCommits,
  selectCommits,
  stageIdFromText,
} from "./agent-sdk-lib.mjs";

const hash = "abc";
const release = { version: "0.3.19", hash };

test("an unpublished version keeps its number when the tree changes", () => {
  const decision = decideRelease({
    version: "0.3.19",
    hash: "new",
    release,
    published: false,
    staged: false,
    copiesWritten: true,
  });
  assert.equal(decision.bump, false);
  assert.equal(decision.version, "0.3.19");
  assert.equal(decision.stamp, true);
});

test("a staged version bumps when this tree is not the staged candidate", () => {
  const decision = decideRelease({
    version: "0.3.19",
    hash,
    release,
    published: false,
    staged: true,
    copiesWritten: false,
  });
  assert.deepEqual(decision, { version: "0.3.20", bump: true, stamp: true });
});

test("a staged version stays when the stamp records this exact tree", () => {
  const decision = decideRelease({
    version: "0.3.19",
    hash,
    release: { ...release, staged: { version: "0.3.19", hash } },
    published: false,
    staged: true,
    copiesWritten: false,
  });
  assert.equal(decision.bump, false);
  assert.equal(decision.stamp, false);
});

test("a published version bumps when the source hash changes", () => {
  const decision = decideRelease({
    version: "0.3.19",
    hash: "new",
    release,
    published: true,
    staged: false,
    copiesWritten: false,
  });
  assert.equal(decision.version, "0.3.20");
  assert.equal(decision.bump, true);
});

test("publish skips a version that is already staged for this hash", () => {
  const decision = decidePublish({
    version: "0.3.19",
    hash,
    release: { ...release, staged: { version: "0.3.19", hash } },
    published: false,
    stageId: "328a2262-266b-442b-8113-26f3d3c1ab32",
  });
  assert.equal(decision.action, "skip");
  assert.equal(decision.reason, "staged");
});

test("publish refuses to stage a version whose candidate is already waiting", () => {
  const decision = decidePublish({
    version: "0.3.19",
    hash: "new",
    release,
    published: false,
    stageId: "328a2262-266b-442b-8113-26f3d3c1ab32",
  });
  assert.equal(decision.action, "bump");
});

test("commits since a release split into agent changes and everything else", () => {
  const commits = parseCommits(
    [
      "aaa\t1111aaaa\tfeat: messaging",
      "bbb\t2222bbbb\tfeat: wallet titles",
    ].join("\n"),
  );
  const split = selectCommits(commits, new Set(["aaa"]));
  assert.deepEqual(split.agent.map((commit) => commit.short), ["1111aaaa"]);
  assert.deepEqual(split.other.map((commit) => commit.subject), ["feat: wallet titles"]);
  assert.deepEqual(parseCommits(""), []);
});

test("the install manifest keeps name and dependency specifiers", () => {
  const manifest = installManifest({
    name: "@playthecut/agent",
    version: "0.4.0",
    dependencies: { canonicalize: "^2.1.0" },
    devDependencies: { typescript: "^5.7.3" },
    scripts: { build: "tsc" },
  });
  assert.deepEqual(manifest, {
    name: "@playthecut/agent",
    dependencies: { canonicalize: "^2.1.0" },
    devDependencies: { typescript: "^5.7.3" },
  });
  assert.equal("version" in manifest, false);
});

test("stage list entries are matched by version", () => {
  const listed = [
    {
      id: "328a2262-266b-442b-8113-26f3d3c1ab32",
      packageName: "@playthecut/agent",
      version: "0.3.19",
      status: "staged",
    },
  ];
  assert.equal(findStageId(listed, "0.3.19")?.id, "328a2262-266b-442b-8113-26f3d3c1ab32");
  assert.equal(findStageId([{ version: "0.3.18", id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }], "0.3.19"), null);
  assert.equal(
    findStageId("staged @playthecut/agent@0.3.19 328a2262-266b-442b-8113-26f3d3c1ab32", "0.3.19")?.id,
    "328a2262-266b-442b-8113-26f3d3c1ab32",
  );
  assert.equal(
    stageIdFromText("+ @playthecut/agent@0.3.19 (staged with id 328a2262-266b-442b-8113-26f3d3c1ab32)"),
    "328a2262-266b-442b-8113-26f3d3c1ab32",
  );
});
