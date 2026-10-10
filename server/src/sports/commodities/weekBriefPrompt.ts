import { COMMODITY_METADATA_ALLOWLIST } from "@cut/sport-commodities";
import { COMMODITIES_SIGN_OFF, TOP_STORIES_TITLE, EVENT_BLURB_TITLE } from "./weekBrief.js";

const FIELD_NAMES = COMMODITY_METADATA_ALLOWLIST.map((entry) => entry.displayName).join(", ");

export type WeekBriefContext = {
  eventName: string;
  weekKey: string;
  dateLine: string;
};

export function buildCommoditiesWeekBriefPrompt(
  ctx: WeekBriefContext,
  retryReason?: string,
): string {
  const retry = retryReason
    ? `\nPREVIOUS OUTPUT WAS REJECTED: ${retryReason}\nFix that and output JSON only.\n`
    : "";
  const dates = ctx.dateLine || ctx.weekKey;

  return `You write the Play The Cut contest announcement for ${ctx.eventName} (${ctx.weekKey}, ${dates}).
The show is called Planet Earth. It is a variety hour, not a commodities desk.
Output a JSON array only. No markdown, no commentary outside JSON.
${retry}
Check current public reporting for this Monday–Friday window before you write. Use only stories you can ground in that reporting.

RULES:
- Two sections, in this order: "${EVENT_BLURB_TITLE}", "${TOP_STORIES_TITLE}".
- Cast a wide net: politics, weather, sports, pop culture, and the odd thing everyone is talking about. Markets are allowed. They are not the assignment. The seven stories should not all be about the same beat.
- Voice: funny, conversational, a little irreverent. Short sentences. No press-release tone. Do not joke about deaths, disaster victims, or violence.
- Contest field: ${FIELD_NAMES}. Use those names. Do not invent other contracts.
- ${EVENT_BLURB_TITLE}: exactly one item, body only (no label). Two or three short sentences with hooks from different corners of the week, then a blank line, then the exact sign-off "${COMMODITIES_SIGN_OFF}". The sign-off is its own last line. No field names in the blurb. Do not invent trips, votes, bills, scores, or meetings.
- ${TOP_STORIES_TITLE}: 5 to 8 items, mixed together, not grouped. Each item has a short headline label and a body of 2 or 3 sentences.
- Exactly 4 of those items have a clear contest impact. Name one or two field contracts and say what the story does to them. No "might," "who knows," "hard to say," or "the field will not notice."
- The other 1 to 3 items are just the fun story. Do not mention the field in those, and do not apologize for the missing link.
- Do not repeat the teaser sentence. Do not include the sign-off. Do not invent trips, votes, bills, scores, or meetings.
- Do not write a "Last week" section.
- Use straight apostrophes.

JSON shape:
[{"title":"${EVENT_BLURB_TITLE}","items":[{"body":"...\\n${COMMODITIES_SIGN_OFF}"}]},{"title":"${TOP_STORIES_TITLE}","items":[{"label":"...","body":"..."}]}]
`;
}

/** Second pass. The draft is not trusted; every score, date, and named result gets checked. */
export function buildCommoditiesWeekBriefFactCheckPrompt(
  ctx: WeekBriefContext,
  draftJson: string,
  retryReason?: string,
): string {
  const retry = retryReason
    ? `\nPREVIOUS FACT CHECK WAS REJECTED: ${retryReason}\nFix that and output JSON only.\n`
    : "";
  const dates = ctx.dateLine || ctx.weekKey;

  return `FACT CHECK the finished Play The Cut announcement for ${ctx.eventName} (${ctx.weekKey}, ${dates}).
This is a separate pass from the draft. Do not trust the draft's numbers.
Look up current public reporting before you answer. Today is the day you are writing, and the contest window is ${dates}.
Output a JSON array only. No markdown, no commentary outside JSON.
${retry}
Correct every score, record, date, ranking, forecast, and named result that is stale or wrong. Standings from earlier in the season are not current if a later game has been played.
If a claim cannot be grounded in current reporting, replace that story. Do not invent a number to fill the gap.
Keep the voice, the sign-off exactly, and the mix: exactly 4 stories with a clear contest impact, and 1 to 3 fun stories with no field mention.
Contest field, when a story names one: ${FIELD_NAMES}. Do not invent other contracts.
Do not add a Last week section. Do not joke about deaths, disaster victims, or violence.

DRAFT:
${draftJson}

JSON shape:
[{"title":"${EVENT_BLURB_TITLE}","items":[{"body":"...\\n${COMMODITIES_SIGN_OFF}"}]},{"title":"${TOP_STORIES_TITLE}","items":[{"label":"...","body":"..."}]}]
`;
}
