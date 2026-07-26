import {
  contestCommentaryVoices,
  DEFAULT_CONTEST_COMMENTARY_VOICE_ID,
  type ContestCommentaryVoiceId,
} from "@cut/sport-sdk";
import type { ContestCommentaryContext, ContestCommentaryStageId } from "./contestCommentary.js";
import type {
  ContestFeedActiveStoryType,
  ContestFeedFactPack,
} from "./contestFeed.js";
import { CONTEST_FEED_WORD_LIMITS } from "./contestFeed.js";

/**
 * Causal beat for live updates: tournament golf moves first; contest standings
 * follow. Applies to every feed story type.
 */
const NARRATIVE_PATTERN: readonly string[] = [
  'Narrative pattern: event → result. The thing that changes is tournament player scoring; contest movement is the result. Prefer causal beats like "Scheffler double-bogeys 13 and 14, which drops Noodles to 9th"—golfer event first, then what it does to a user\'s position, leverage, or paid-cut status.',
  "Mention tournament board / position-bonus only when it is impactful to the story—typically when bonusDelta is non-zero (entering, leaving, or swapping 1st/2nd/3rd bonus of 10/5/3). Do not narrate board ties, flat leaderboard labels (e.g. 61→T61), or zero-bonus beats. When bonusDelta is impactful: hole result → board/bonus change → lineup contest impact.",
  "When hole-level detail is absent from the facts, still keep that order using whatever golf score movement is present, then the contest consequence. Never invent hole results or golfer outcomes.",
];

/** Always-on output contract — no stage-specific analytical framing. */
const OUTPUT_CONTRACT: readonly string[] = [
  "Do not invent scores, odds, ownership, names, injuries, tee times, or golf results.",
  'Never invent broadcast phrases such as "cut week," "cut-week," or similar. Use ordinary golf language only (the cut, cut line, made the cut).',
  "Do not echo internal stage labels (stageId, cut_round, opening_round, storyType, etc.) in the commentary.",
  "Return only the finished commentary as plain prose: no title, bullets, markdown, caveats, or word count.",
];

/** Story-type framing is primary; stage instructions are an overlay. */
const STORY_INSTRUCTIONS: Record<ContestFeedActiveStoryType, readonly string[]> = {
  score_swing: [
    "Story: score swing. Focus only on the hole events and contest impacts in STORY_FACTS_JSON.",
    "Hard-require opening: the first sentence must name the golfer and hole result from events (label and hole number). Do not open with Sunday framing, tournament leaders, remaining golf, or the contest scoreboard/paid-cut standings.",
    "Causal chain after that open: (1) golfer hole result(s) from events, (2) only if bonusDelta is non-zero, a brief tournament board / position-bonus beat, (3) what that did to owning users in impacts (score / position / paid-cut moves).",
    "Do not invent holes, board places, or bonus points beyond events. If bonusDelta is 0, skip board and position-bonus entirely—do not say there was no bonus, list 10/5/3, or narrate cosmetic place changes.",
    "Keep it one tight causal beat. Do not widen into a full contest recap, routes, or ownership ladders.",
  ],
  leverage_spike: [
    "Story: leverage spike. Focus only on the golfer(s) whose contest leverage rose in STORY_FACTS_JSON.",
    "Frame as event → result: the golfer's scoring or standing is the event; the swing for owning users is the result. Explain why this player now moves the contest—not a full race board or route analysis.",
    "Keep it flash-length and concrete. Do not invent hole results beyond the supplied facts.",
  ],
  stage_recap: [
    "Story: stage recap. Write a full contest outlook using the supplied contest context JSON.",
    "When citing live movement, keep event → result order (tournament scoring → contest consequence). Cover the race, ownership/leverage or routes as the stage overlay directs, and keep the finish worth watching.",
  ],
};

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
    "Stage guidance: approaching the tournament cut. Orient on the contest race and cut-line progress—less on ownership stacks, leverage ladders, or route-to-win detail, and not tournament-leader tee-time pacing.",
    "Cut-line and made-cut uncertainty still matter; use uncertaintyNotes when present. Do not invent cut outcomes.",
    "Avoid leader-pace framing (“leaders approaching the turn,” “closing stretch”) unless eventProgress.leaderProgress is present—which it is not in this stage.",
    "Exact current contest scores and the paid-cut gap may be stated once when establishing the race, but avoid turning the update into a list of numbers.",
    "Mention ownership or shared golfers only when they clearly shape the cut picture; do not prioritize lineupRoutes or miracle/narrow path language.",
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

/** Legacy single-snapshot prompt (stage_recap framing). */
export function buildPgaContestCommentaryPrompt(
  options: BuildPgaContestCommentaryPromptOptions,
): string {
  return buildPgaContestFeedPrompt({
    storyType: "stage_recap",
    factPack: { storyType: "stage_recap", context: options.context },
    voiceId: options.voiceId,
    correctiveFeedback: options.correctiveFeedback,
    minWords: options.minWords,
    maxWords: options.maxWords,
  });
}

export interface BuildPgaContestFeedPromptOptions {
  storyType: ContestFeedActiveStoryType;
  factPack: ContestFeedFactPack;
  voiceId?: ContestCommentaryVoiceId;
  correctiveFeedback?: string;
  minWords?: number;
  maxWords?: number;
}

function stageIdFromFactPack(factPack: ContestFeedFactPack): ContestCommentaryStageId {
  if (factPack.storyType === "stage_recap") {
    return factPack.context.eventProgress.stageId;
  }
  return factPack.stageId;
}

/**
 * Feed prompt: story instructions first, stage overlay for stage_recap only,
 * narrow fact JSON last. Flash stories (score_swing, leverage_spike) omit the
 * stage overlay so weekend/final “open from leaderProgress / establish the race”
 * lines cannot override event-first framing.
 */
export function buildPgaContestFeedPrompt(
  options: BuildPgaContestFeedPromptOptions,
): string {
  const voiceId = options.voiceId ?? DEFAULT_CONTEST_COMMENTARY_VOICE_ID;
  const voice = contestCommentaryVoices[voiceId];
  const limits = CONTEST_FEED_WORD_LIMITS[options.storyType];
  const minWords = options.minWords ?? limits.minWords;
  const maxWords = options.maxWords ?? limits.maxWords;
  const stageId = stageIdFromFactPack(options.factPack);
  const storyInstructions = STORY_INSTRUCTIONS[options.storyType];
  const includeStageOverlay = options.storyType === "stage_recap";
  const stageInstructions = includeStageOverlay
    ? STAGE_INSTRUCTIONS[stageId]
    : [];

  const factsPayload =
    options.factPack.storyType === "stage_recap"
      ? `CONTEST_CONTEXT_JSON=${JSON.stringify(options.factPack.context)}`
      : `STORY_FACTS_JSON=${JSON.stringify(options.factPack)}`;

  return [
    "Write one live contest feed update using only the supplied JSON facts.",
    `Length must be ${minWords}-${maxWords} words.`,
    ...voice.instructions,
    ...NARRATIVE_PATTERN,
    ...storyInstructions,
    ...stageInstructions,
    ...OUTPUT_CONTRACT,
    options.correctiveFeedback
      ? `Correction required after the previous attempt: ${options.correctiveFeedback}`
      : "",
    factsPayload,
  ]
    .filter(Boolean)
    .join("\n");
}
