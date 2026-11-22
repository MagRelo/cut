import { prepareAgentRelease } from "./agent-sdk-lib.mjs";

let result;
try {
  result = await prepareAgentRelease();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

if (result.written.length > 0) {
  console.log(`Copied agent docs:\n${result.written.join("\n")}`);
}
if (result.bump) {
  console.log(`Bumped @playthecut/agent to ${result.version}.`);
}
if (result.stamp || result.bump) {
  console.log(`Stamped @playthecut/agent@${result.version}.`);
} else if (result.published) {
  console.log(`@playthecut/agent@${result.version} is already on npm.`);
} else if (result.staged) {
  console.log(
    result.stageId
      ? `@playthecut/agent@${result.version} is already staged. Approve it with npm stage approve ${result.stageId}.`
      : `@playthecut/agent@${result.version} is already staged.`,
  );
} else {
  console.log(`@playthecut/agent@${result.version} matches the spec. It is not on npm yet.`);
}
