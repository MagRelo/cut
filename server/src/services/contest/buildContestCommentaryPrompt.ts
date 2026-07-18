import type { ContestCommentaryContext } from "@cut/sport-pga-golf";
import {
  contestCommentaryVoices,
  DEFAULT_CONTEST_COMMENTARY_VOICE_ID,
  type ContestCommentaryVoiceId,
} from "./contestCommentaryVoices.js";

export const COMMENTARY_MIN_WORDS = 125;
export const COMMENTARY_MAX_WORDS = 175;

export function buildContestCommentaryPrompt(
  context: ContestCommentaryContext,
  correctiveFeedback?: string,
  voiceId: ContestCommentaryVoiceId = DEFAULT_CONTEST_COMMENTARY_VOICE_ID,
): string {
  const voice = contestCommentaryVoices[voiceId];
  return [
    "Write one live contest update using only the supplied JSON facts.",
    `Length must be ${COMMENTARY_MIN_WORDS}-${COMMENTARY_MAX_WORDS} words.`,
    ...voice.instructions,
    "Establish the current race briefly, then prioritize routes to winning over repeating current positions. Use lineupRoutes to explain which golfers each lineup needs to outperform, which teams share the same dependency, and whether a path is broad, narrow, or miracle-level.",
    "Treat route metrics as analytical guidance, not copy. Never quote baselineRemainingMedian, routeRemainingMedian, requiredPercentile, or scenarioCount. Translate them into natural golf language such as “needs a good day,” “has to carry the lineup,” “needs a big finish,” or “requires nearly everything to break right.”",
    "Exact current contest scores and the paid-cut gap may be stated once when establishing the race, but avoid turning the update into a list of numbers.",
    "Connect golfers to their owning users explicitly. Use sharedDependencies for angles such as two teams both needing the same golfer. Mention required hole-in-ones only when requiredHoleInOnes is greater than zero; otherwise never manufacture an ace scenario.",
    "Balance upside with downside. Stableford holes can score -1 or -3, so a golfer can actively hurt a lineup rather than merely fail to add points. Use sharedDownsideRisks to identify golfers whose bad holes could drag several contenders down together.",
    "Do not quote downsideRemaining, downsideSwing, negativeRemainingProbability, or negativeHoleProbability. Translate that risk conversationally: a shared golfer can “sink several lineups,” “take multiple teams down with him,” or “turn shared safety into shared damage.”",
    "Use high-leverage and rarity data to explain separation, not as a substitute for the route-to-win analysis. You do not need to mention every contender, but cover materially different paths through the race.",
    "Stay optimistic and make the finish feel worth watching, but do not claim an effectively eliminated lineup is live.",
    "Do not invent scores, odds, ownership, names, injuries, tee times, or golf results. Distinguish lineup rarity from lineup quality.",
    "Return only the finished commentary as plain prose: no title, bullets, markdown, caveats, or word count.",
    correctiveFeedback
      ? `Correction required after the previous attempt: ${correctiveFeedback}`
      : "",
    `CONTEST_CONTEXT_JSON=${JSON.stringify(context)}`,
  ]
    .filter(Boolean)
    .join("\n");
}
