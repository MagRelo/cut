import {
  contestCommentaryVoices,
  DEFAULT_CONTEST_COMMENTARY_VOICE_ID,
  type ContestCommentaryVoiceId,
} from "@cut/sport-sdk";
import type { ContestCommentaryContext, ContestCommentaryStageId } from "./contestCommentary.js";
import type {
  ContestFeedActiveStoryType,
  ContestFeedFactPack,
  ContestFeedStoryIntensity,
} from "./contestFeed.js";
import { resolveContestFeedWordLimits } from "./contestFeed.js";

/**
 * Causal beat for live updates: tournament golf moves first; contest standings
 * follow. Applies to every feed story type.
 */
const NARRATIVE_PATTERN: readonly string[] = [
  'Narrative pattern: event → result. Tournament player scoring is the cause; contest movement is the effect. Prefer causal beats like "Scheffler double-bogeys 13 and 14, which drops Noodles to 9th"—but the consequence may land first when the sentence still reads causally.',
  "Mention tournament board / position-bonus only when it is impactful to the story—typically when bonusDelta is non-zero (entering, leaving, or swapping 1st/2nd/3rd bonus of 10/5/3). Do not narrate board ties, flat leaderboard labels (e.g. 61→T61), or zero-bonus beats.",
  "When hole-level detail is absent from the facts, still keep cause and effect using whatever golf score movement is present, then the contest consequence. Never invent hole results or golfer outcomes.",
];

/** Always-on output contract — no stage-specific analytical framing. */
const OUTPUT_CONTRACT: readonly string[] = [
  "Do not invent scores, odds, ownership, names, injuries, tee times, or golf results.",
  'Never invent broadcast phrases such as "cut week," "cut-week," or similar. Use ordinary golf language only (the cut, cut line, made the cut).',
  "Do not echo internal stage labels (stageId, cut_round, opening_round, storyType, etc.) in the commentary.",
  "Return only the finished commentary as plain prose: no title, bullets, markdown, caveats, or word count.",
];

/**
 * Keep internal analytics out of published copy. Fact JSON may still contain
 * these fields for reasoning.
 */
const METRIC_DISCIPLINE: readonly string[] = [
  'Never write the word "leverage." It is an internal term, not broadcast language.',
  "Never quote ownershipShare, rarityScore, payoutSwing, consensusStrength, winProbability, or payoutProbability as numbers. Translate ownership conversationally (only one lineup has him, the popular pick, nobody else took that swing).",
  "At most one numeric contest-score pair (previousScore to currentScore) per item; otherwise describe place or paid-cut moves in words. Stableford or position-bonus point counts are fine when they are the hole/board result itself.",
];

const INTENSITY_INSTRUCTIONS: Record<ContestFeedStoryIntensity, string> = {
  routine:
    "Intensity: routine. One beat. State the event and its consequence, then stop. No scene-setting, no closing flourish, no joke required.",
  notable:
    "Intensity: notable. Two or three beats. Room for one line of reaction. Earn any personality; do not pad.",
  major:
    "Intensity: major. Full call. Earn the volume—this one actually changed the contest. Personality is welcome when grounded in the facts.",
};

const STYLE_DIRECTIVES: readonly string[] = [
  "Style: open cold on the hole result—no wind-up.",
  "Style: open on the owner's reaction, then reveal what caused it.",
  "Style: two sentences only. No closing line after the consequence.",
  "Style: let the final sentence land flat and factual—no zinger.",
  "Style: lead with the standings consequence, then name the shot that caused it.",
];

/** Story-type framing is primary; stage instructions are an overlay. */
const STORY_INSTRUCTIONS: Record<ContestFeedActiveStoryType, readonly string[]> = {
  score_swing: [
    "Story: score swing. Focus only on the hole events and contest impacts in STORY_FACTS_JSON.",
    "Keep event → result causality: the golf hole result is the cause; the owning users' score / position / paid-cut moves are the effect. Do not open with Sunday framing, tournament leaders, remaining golf, or a full contest scoreboard.",
    "Include a brief tournament board / position-bonus beat only if bonusDelta is non-zero. If bonusDelta is 0, skip board and position-bonus entirely—do not say there was no bonus, list 10/5/3, or narrate cosmetic place changes.",
    "Do not invent holes, board places, or bonus points beyond events. Keep it tight. Do not widen into a full contest recap, routes, or ownership ladders.",
  ],
  stage_recap: [
    "Story: stage recap. Write a full contest outlook using the supplied contest context JSON.",
    "When citing live movement, keep event → result order (tournament scoring → contest consequence). Cover the race, ownership edge or routes as the stage overlay directs, and keep the finish worth watching.",
  ],
};

const STAGE_INSTRUCTIONS: Record<ContestCommentaryStageId, readonly string[]> = {
  opening_round: [
    "Stage: opening round. Orient on early tournament progress, contest ownership, consensus, and rarity—not a deep contest race board or route-to-win analysis, and not tournament-leader tee-time pacing.",
    "Wave tee times mean early-round field progress is uneven; do not frame the update around “leaders on the front/back nine.”",
    "Acknowledge early-round uncertainty when uncertaintyNotes mention it. Prefer structural outlook language over crowning a locked favorite.",
    "Use highLeveragePlayers, consensusPlayers, and highRarityLineups as the main story. Connect golfers to their owning users when ownership angles matter. Translate ownership edge conversationally—never quote internal rarity or ownership metrics as numbers.",
    "Exact current contest scores and the paid-cut gap may be sketched lightly for orientation, but avoid scoreboard laundry lists and avoid prioritizing lineupRoutes.",
    "If you mention shared ownership risk, keep it light: Stableford holes can score -1 or -3, so a popular golfer can hurt several lineups—but do not turn this stage into route or miracle-path analysis.",
    "Stay optimistic about the week ahead. Do not claim an effectively eliminated lineup is live.",
  ],
  cut_round: [
    "Stage guidance: approaching the tournament cut. Orient on the contest race and cut-line progress—less on ownership stacks or route-to-win detail, and not tournament-leader tee-time pacing.",
    "Cut-line and made-cut uncertainty still matter; use uncertaintyNotes when present. Do not invent cut outcomes.",
    "Avoid leader-pace framing (“leaders approaching the turn,” “closing stretch”) unless eventProgress.leaderProgress is present—which it is not in this stage.",
    "Exact current contest scores and the paid-cut gap may be stated once when establishing the race, but avoid turning the update into a list of numbers.",
    "Mention ownership or shared golfers only when they clearly shape the cut picture; do not prioritize lineupRoutes or miracle/narrow path language.",
    "Stay optimistic, but do not claim an effectively eliminated lineup is live.",
  ],
  weekend_move: [
    "Stage: weekend move day. Routes and ownership edges become clearer and more relevant for commentary.",
    "Open from eventProgress.leaderProgress when present: note colloquially how much golf remains for the leaders, then establish the contest race. Translate pace naturally (yet to tee off, approaching the turn, back nine, closing stretch). Do not quote holesRemaining unless an exact hole count is genuinely useful.",
    "Help readers see correlation and divergence between tournament outcomes and contest outcomes—highlight golfers who move the contest most.",
    "Keep the opening concise, then prioritize routes to winning over repeated position updates. Use lineupRoutes to explain which golfers each lineup needs, which teams share the same dependency, and whether a path is broad, narrow, or miracle-level.",
    "Treat route metrics as analytical guidance, not copy. Never quote baselineRemainingMedian, routeRemainingMedian, requiredPercentile, or scenarioCount. Translate them into natural golf language such as “needs a good day,” “has to carry the lineup,” “needs a big finish,” or “requires nearly everything to break right.”",
    "Exact current contest scores and the paid-cut gap may be stated once when establishing the race, but avoid turning the update into a list of numbers.",
    "Connect golfers to their owning users explicitly. Use sharedDependencies for shared-need angles. Mention required hole-in-ones only when requiredHoleInOnes is greater than zero; otherwise never manufacture an ace scenario.",
    "Balance upside with downside. Stableford holes can score -1 or -3. Use sharedDownsideRisks for golfers whose bad holes could drag several contenders down. Do not quote downsideRemaining, downsideSwing, negativeRemainingProbability, or negativeHoleProbability—translate conversationally (“sink several lineups,” “shared safety into shared damage”).",
    "Use ownership-edge and rarity data to explain separation, not as a substitute for route-to-win analysis. Cover materially different paths; you need not mention every contender.",
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
    "Use ownership-edge and rarity data to explain separation alongside routes. Cover materially different paths; you need not mention every contender.",
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
    intensity: "notable",
  });
}

export interface BuildPgaContestFeedPromptOptions {
  storyType: ContestFeedActiveStoryType;
  factPack: ContestFeedFactPack;
  voiceId?: ContestCommentaryVoiceId;
  correctiveFeedback?: string;
  minWords?: number;
  maxWords?: number;
  intensity?: ContestFeedStoryIntensity;
  /** Newest feed item texts to avoid repeating (most recent first). */
  recentTexts?: readonly string[];
  /** Seed for deterministic style directive (subjectKey + generatedAt). */
  styleSeed?: string;
}

function stageIdFromFactPack(factPack: ContestFeedFactPack): ContestCommentaryStageId {
  if (factPack.storyType === "stage_recap") {
    return factPack.context.eventProgress.stageId;
  }
  return factPack.stageId;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Deterministic style directive from a seed string. */
export function selectContestFeedStyleDirective(seed: string): string {
  const index = hashString(seed) % STYLE_DIRECTIVES.length;
  return STYLE_DIRECTIVES[index]!;
}

function recentPublishedBlock(recentTexts: readonly string[] | undefined): string {
  if (recentTexts == null || recentTexts.length === 0) return "";
  const clipped = recentTexts
    .slice(0, 5)
    .map((text, index) => `${index + 1}. ${text.trim()}`)
    .filter((line) => line.length > 3);
  if (clipped.length === 0) return "";
  return [
    "RECENTLY_PUBLISHED (do not reuse openings, closings, metaphors, or distinctive verbs from these):",
    ...clipped,
  ].join("\n");
}

/**
 * Feed prompt: story instructions first, stage overlay for stage_recap only,
 * narrow fact JSON last. Flash stories (score_swing) omit the
 * stage overlay so weekend/final “open from leaderProgress / establish the race”
 * lines cannot override event-first framing.
 */
export function buildPgaContestFeedPrompt(
  options: BuildPgaContestFeedPromptOptions,
): string {
  const voiceId = options.voiceId ?? DEFAULT_CONTEST_COMMENTARY_VOICE_ID;
  const voice = contestCommentaryVoices[voiceId];
  const intensity = options.intensity ?? "notable";
  const limits = resolveContestFeedWordLimits(options.storyType, intensity);
  const minWords = options.minWords ?? limits.minWords;
  const maxWords = options.maxWords ?? limits.maxWords;
  const stageId = stageIdFromFactPack(options.factPack);
  const storyInstructions = STORY_INSTRUCTIONS[options.storyType];
  const includeStageOverlay = options.storyType === "stage_recap";
  const stageInstructions = includeStageOverlay
    ? STAGE_INSTRUCTIONS[stageId]
    : [];
  const styleDirective =
    options.styleSeed != null && options.styleSeed.trim()
      ? selectContestFeedStyleDirective(options.styleSeed)
      : "";

  const factsPayload =
    options.factPack.storyType === "stage_recap"
      ? `CONTEST_CONTEXT_JSON=${JSON.stringify(options.factPack.context)}`
      : `STORY_FACTS_JSON=${JSON.stringify(options.factPack)}`;

  return [
    "Write one live contest feed update using only the supplied JSON facts.",
    `Length must be ${minWords}-${maxWords} words.`,
    ...voice.instructions,
    INTENSITY_INSTRUCTIONS[intensity],
    styleDirective,
    ...NARRATIVE_PATTERN,
    ...storyInstructions,
    ...stageInstructions,
    ...METRIC_DISCIPLINE,
    ...OUTPUT_CONTRACT,
    recentPublishedBlock(options.recentTexts),
    options.correctiveFeedback
      ? `Correction required after the previous attempt: ${options.correctiveFeedback}`
      : "",
    factsPayload,
  ]
    .filter(Boolean)
    .join("\n");
}
