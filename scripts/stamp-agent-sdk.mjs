import { prepareAgentRelease } from "./agent-sdk-lib.mjs";

let result;
try {
  result = await prepareAgentRelease();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

if (result.bump) console.log(`Bumped @playthecut/agent to ${result.version}.`);
console.log(`Stamped @playthecut/agent@${result.version}.`);
