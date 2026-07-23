import {
  contestCommentaryVoices,
  DEFAULT_CONTEST_COMMENTARY_VOICE_ID,
  type ContestCommentaryVoiceId,
} from "@cut/sport-sdk";
import type {
  ContestCommentaryContext,
  ContestCommentaryStageId,
} from "./contestCommentary.js";

/** Always-on output contract — no stage-specific analytical framing. */
const OUTPUT_CONTRACT: readonly string[] = [
  "Do not invent scores, odds, ownership, names, injuries, tee times, or golf results. Distinguish lineup rarity from lineup quality.",
  "Return only the finished commentary as plain prose: no title, bullets, markdown, caveats, or word count.",
];

const STAGE_INSTRUCTIONS: Record<ContestCommentaryStageId, readonly string[]> = {
  opening_round: [
    "Stage: opening round. Orient on early tournament progress, contest ownership, leverage, consensus, and rarity—not a deep contest race board or route-to-win analysis, and not tournament-leader tee-time pacing.",
    "Wave tee times mean early-round field progress is uneven; do not frame the update around “leaders on the front/back nine.”",
    "Acknowledge early-round uncertainty when uncertaintyNotes mention it. Prefer structural outlook language over crowning a locked favorite.",
    "Use highLeveragePlayers, consensusPlayers, and highRarityLineups as the main story. Connect golfers to their owning users when ownership angles matter.",
    "Exact current contest scores and the paid-cut gap may be sketched lightly for orientation, but avoid scoreboard laundry lists and avoid prioritizing lineupRoutes.",
    "If you mention shared ownership risk, keep it light: Stableford holes can score -1 or -3, so a popular golfer can hurt several lineups—but do not turn this stage into route or miracle-path analysis.",
    "Stay optimistic about the week ahead. Do not claim an effectively eliminated lineup is live.",
  ],
  cut_round: [
    "Stage: cut round. Orient on the contest race and tournament cut progress—less on ownership stacks, leverage ladders, or route-to-win detail, and not tournament-leader tee-time pacing.",
    "Cut-line and made-cut uncertainty still matter; use uncertaintyNotes when present. Do not invent cut outcomes.",
    "Avoid leader-pace framing (“leaders approaching the turn,” “closing stretch”) unless eventProgress.leaderProgress is present—which it is not in this stage.",
    "Exact current contest scores and the paid-cut gap may be stated once when establishing the race, but avoid turning the update into a list of numbers.",
    "Mention ownership or shared golfers only when they clearly shape the cut-week contest picture; do not prioritize lineupRoutes or miracle/narrow path language.",
    "Stay optimistic, but do not claim an effectively eliminated lineup is live.",
  ],
  weekend_move: [
    "Stage: weekend move day. Routes and leverage become clearer and more relevant for commentary.",
    "Open from eventProgress.leaderProgress when present: note colloquially how much golf remains for the leaders, then establish the contest race. Translate pace naturally (yet to tee off, approaching the turn, back nine, closing stretch). Do not quote holesRemaining unless an exact hole count is genuinely useful.",
    "Help readers see correlation and divergence between tournament outcomes and contest outcomes—highlight golfers who move the contest most.",
    "Keep the opening concise, then prioritize routes to winning over repeated position updates. Use lineupRoutes to explain which golfers each lineup needs, which teams share the same dependency, and whether a path is broad, narrow, or miracle-level.",
    "Treat route metrics as analytical guidance, not copy. Never quote baselineRemainingMedian, routeRemainingMedian, requiredPercentile, or scenarioCount. Translate them into natural golf language such as “needs a good day,” “has to carry the lineup,” “needs a big finish,” or “requires nearly everything to break right.”",
    "Exact current contest scores and the paid-cut gap may be stated once when establishing the race, but avoid turning the update into a list of numbers.",
    "Connect golfers to their owning users explicitly. Use sharedDependencies for shared-need angles. Mention required hole-in-ones only when requiredHoleInOnes is greater than zero; otherwise never manufacture an ace scenario.",
    "Balance upside with downside. Stableford holes can score -1 or -3. Use sharedDownsideRisks for golfers whose bad holes could drag several contenders down. Do not quote downsideRemaining, downsideSwing, negativeRemainingProbability, or negativeHoleProbability—translate conversationally (“sink several lineups,” “shared safety into shared damage”).",
    "Use high-leverage and rarity data to explain separation, not as a substitute for route-to-win analysis. Cover materially different paths; you need not mention every contender.",
    "Stay optimistic and make the finish feel worth watching, but do not claim an effectively eliminated lineup is live.",
  ],
  final_round: [
    "Stage: final round. Open by using eventProgress.leaderProgress to note colloquially how much golf remains for the leaders, then establish the current contest race. Translate pace naturally; do not quote holesRemaining unless an exact hole count is genuinely useful.",
    "At this point some teams are clearly out—try not to mention them specifically. Long shots can still be interesting; mention them in a realistic yet optimistic way.",
    "Sunday pressure is highest: keep the finish feeling live while staying faithful to contention tiers and routes.",
    "Keep the opening concise, then prioritize routes to winning over repeated position updates. Use lineupRoutes for key needs, shared dependencies, and broad/narrow/miracle plausibility.",
    "Treat route metrics as analytical guidance, not copy. Never quote baselineRemainingMedian, routeRemainingMedian, requiredPercentile, or scenarioCount. Translate into natural golf language.",
    "Exact current contest scores and the paid-cut gap may be stated once when establishing the race, but avoid turning the update into a list of numbers.",
    "Connect golfers to their owning users explicitly. Use sharedDependencies and sharedDownsideRisks. Mention required hole-in-ones only when requiredHoleInOnes is greater than zero.",
    "Do not quote downsideRemaining, downsideSwing, negativeRemainingProbability, or negativeHoleProbability—translate risk conversationally.",
    "Use high-leverage and rarity data to explain separation alongside routes. Cover materially different paths; you need not mention every contender.",
    "Stay optimistic, but do not claim an effectively eliminated lineup is live.",
  ],
  unknown: [
    "Stage is unknown. Establish the contest picture from the supplied scores, ownership, and routes without inventing round or leader-pace framing.",
    "If eventProgress.leaderProgress is absent, do not invent leader hole counts or tee-time pacing.",
    "Exact current contest scores may be stated once for orientation; avoid number laundry lists.",
    "Use routes and ownership only as far as the facts support; never invent dependencies or outcomes.",
    "Stay optimistic, but do not claim an effectively eliminated lineup is live.",
  ],
};

export interface BuildPgaContestCommentaryPromptOptions {
  context: ContestCommentaryContext;
  voiceId?: ContestCommentaryVoiceId;
  correctiveFeedback?: string;
  minWords: number;
  maxWords: number;
}

export function buildPgaContestCommentaryPrompt(
  options: BuildPgaContestCommentaryPromptOptions,
): string {
  const voiceId = options.voiceId ?? DEFAULT_CONTEST_COMMENTARY_VOICE_ID;
  const voice = contestCommentaryVoices[voiceId];
  const stageId = options.context.eventProgress.stageId;
  const stageInstructions = STAGE_INSTRUCTIONS[stageId];

  return [
    "Write one live contest update using only the supplied JSON facts.",
    `Length must be ${options.minWords}-${options.maxWords} words.`,
    ...voice.instructions,
    ...stageInstructions,
    ...OUTPUT_CONTRACT,
    options.correctiveFeedback
      ? `Correction required after the previous attempt: ${options.correctiveFeedback}`
      : "",
    `CONTEST_CONTEXT_JSON=${JSON.stringify(options.context)}`,
  ]
    .filter(Boolean)
    .join("\n");
}
