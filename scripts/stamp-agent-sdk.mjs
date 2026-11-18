import { stampRelease } from "./agent-sdk-lib.mjs";

const { version } = stampRelease();
console.log(`Stamped @playthecut/agent@${version}.`);
