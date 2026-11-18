import { syncAgentDocs } from "./agent-sdk-lib.mjs";

const written = syncAgentDocs();
if (written.length === 0) {
  console.log("Agent docs already match.");
} else {
  console.log(`Copied agent docs:\n${written.join("\n")}`);
}
