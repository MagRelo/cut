import {
  contestCommentaryVoices,
  DEFAULT_CONTEST_COMMENTARY_VOICE_ID,
  type ContestCommentaryVoiceId,
} from "@cut/sport-sdk";
import type {
  CommoditiesCommentaryStageId,
  CommoditiesContestCommentaryContext,
} from "./contestCommentary.js";

const NARRATIVE_PATTERN: readonly string[] = [
  "Narrative pattern: market move → contest result. Commodity price / fantasy-point swings are the event; contest position and paid-cut movement are the result.",
  'Prefer causal beats like "Crude Oil drops 3% on Tuesday, which knocks Alex out of the paid places"—ticker move first, then what it does to a user\'s score or standing.',
  "Do not invent prices, percentages, ownership, or user names beyond the supplied JSON.",
];

const OUTPUT_CONTRACT: readonly string[] = [
  "Do not invent scores, odds, ownership, names, or market outcomes.",
  "Do not echo internal stage labels (stageId, opening_day, midweek, etc.) in the commentary.",
  "Return only the finished commentary as plain prose: no title, bullets, markdown, caveats, or word count.",
];

const STAGE_INSTRUCTIONS: Record<CommoditiesCommentaryStageId, readonly string[]> = {
  opening_day: [
    "Stage: opening trading day settled (Monday). Orient on early ownership, consensus picks, and who jumped ahead after day one—not a locked favorite narrative.",
    "Use dayMovers for the main market story. Connect tickers to owning users when ownership angles matter.",
    "Exact contest scores and the paid-cut gap may be sketched lightly; avoid laundry lists.",
    "Stay optimistic about the week ahead. Do not claim an effectively eliminated lineup is live.",
  ],
  midweek: [
    "Stage: midweek (Tuesday or Wednesday settled). Establish the contest race after the day's movers, then note shared ownership risk.",
    "Highlight dayMovers and which lineups own the big swings. Mention consensus only when it shapes the race.",
    "Exact scores and paid-cut gap may be stated once; avoid turning the update into a list of numbers.",
    "Stay optimistic, but do not claim an effectively eliminated lineup is live.",
  ],
  late_week: [
    "Stage: Thursday settled — one day remains. Prioritize who sits inside/outside the paid cut and which tickers still matter Friday.",
    "Use dayMovers and sharedPicks to explain correlation risk into the final session.",
    "Keep the finish feeling live while staying faithful to contention tiers.",
    "Stay optimistic, but do not claim an effectively eliminated lineup is live.",
  ],
  final_day: [
    "Stage: Friday settled — week complete. Recap how the final day reshuffled the contest and who locked the money places.",
    "Lead with the decisive market movers, then the final race outcome. Celebrate the winner without inventing drama.",
    "Exact final scores may be stated once for orientation.",
  ],
  unknown: [
    "Stage is unknown. Establish the contest picture from the supplied scores and ownership without inventing which trading day just settled.",
    "Use dayMovers only when present. Never invent market outcomes.",
    "Stay optimistic, but do not claim an effectively eliminated lineup is live.",
  ],
};

export interface BuildCommoditiesContestCommentaryPromptOptions {
  context: CommoditiesContestCommentaryContext;
  voiceId?: ContestCommentaryVoiceId;
  correctiveFeedback?: string;
  minWords: number;
  maxWords: number;
}

/** End-of-day overview prompt (125–175 words in production). */
export function buildCommoditiesContestCommentaryPrompt(
  options: BuildCommoditiesContestCommentaryPromptOptions,
): string {
  const voiceId = options.voiceId ?? DEFAULT_CONTEST_COMMENTARY_VOICE_ID;
  const voice = contestCommentaryVoices[voiceId];
  const stageId = options.context.eventProgress.stageId;
  const dayLabel = options.context.eventProgress.dayLabel;

  return [
    "Write one end-of-day contest overview using only the supplied JSON facts.",
    dayLabel
      ? `This recap covers the settled ${dayLabel} trading session.`
      : "This is a commodities contest race overview.",
    `Length must be ${options.minWords}-${options.maxWords} words.`,
    ...voice.instructions,
    ...NARRATIVE_PATTERN,
    ...STAGE_INSTRUCTIONS[stageId],
    ...OUTPUT_CONTRACT,
    options.correctiveFeedback
      ? `Correction required after the previous attempt: ${options.correctiveFeedback}`
      : "",
    `CONTEST_CONTEXT_JSON=${JSON.stringify(options.context)}`,
  ]
    .filter(Boolean)
    .join("\n");
}
