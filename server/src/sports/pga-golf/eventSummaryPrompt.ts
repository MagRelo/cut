import {
  DEFAULT_CUTBOT_ATTRIBUTION,
  DEFAULT_QUOTE_COLOR,
  type GolfEventMetadata,
} from "@cut/sport-pga-golf";
import {
  formatAmericanOdds,
  formatPlayerOddsLabel,
  type SourcedPlayerOdds,
} from "./datagolf/outrightOdds.js";

export type EventSummaryPlayer = {
  displayName: string;
  owgr?: number | null;
  odds: SourcedPlayerOdds | null;
};

export type EventSummaryContext = {
  eventName: string;
  course?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  displayDates?: string | undefined;
  purse?: number | null;
  format?: string | null;
  fieldSize: number;
  players: EventSummaryPlayer[];
  oddsEventName?: string | null;
};

function factsBlock(ctx: EventSummaryContext): string {
  const lines = [
    `Tournament: ${ctx.eventName}`,
    ctx.course ? `Course: ${ctx.course}` : null,
    ctx.city || ctx.state ? `Place: ${[ctx.city, ctx.state].filter(Boolean).join(", ")}` : null,
    ctx.displayDates ? `Dates: ${ctx.displayDates}` : null,
    ctx.purse != null ? `Purse: ${ctx.purse}` : null,
    ctx.format ? `Format: ${ctx.format}` : null,
    `Field size: ${ctx.fieldSize}`,
  ];
  return lines.filter(Boolean).join("\n");
}

function playersBlock(ctx: EventSummaryContext): string {
  if (ctx.players.length === 0) return "(no field names)";
  return ctx.players
    .map((player) => {
      const label = formatPlayerOddsLabel(player.displayName, player.odds?.quotes ?? []);
      const rank = player.owgr != null ? ` OWGR ${player.owgr}` : "";
      const books =
        player.odds && player.odds.quotes.length > 0
          ? ` books=${player.odds.quotes.map(formatAmericanOdds).join(",")}`
          : " (no sportsbook quotes)";
      return `- ${label}${rank}${books}`;
    })
    .join("\n");
}

export function buildGolfEventSummaryPrompt(
  ctx: EventSummaryContext,
  retryReason?: string,
): string {
  const retry = retryReason
    ? `\nPREVIOUS OUTPUT WAS REJECTED: ${retryReason}\nFix that and output JSON only.\n`
    : "";

  return `You write Play The Cut tournament preview copy for the announcement card and email.
Output a JSON array only. No markdown, no commentary outside JSON.
${retry}
FACTS (do not invent anything missing):
${factsBlock(ctx)}
${ctx.oddsEventName ? `Sportsbook board event: ${ctx.oddsEventName}` : "Sportsbook board: not matched for this tournament — do not include American odds."}

BEST PLAYERS (use these names; copy odds tokens exactly from the label prefix):
${playersBlock(ctx)}

RULES:
- Canonical sections in this order when you have facts: "From the 19th Hole", "Event Blurb", "Best Players and Odds", "Course and Format".
- Omit "Broadcast Information" unless TV windows are in FACTS (they are not).
- From the 19th Hole: exactly one quote item. This is the advertisement, not a fact sheet. body = 3 short sentences. Place and feeling first, week stakes, at most 2 player names. attribution "${DEFAULT_CUTBOT_ATTRIBUTION}", color "${DEFAULT_QUOTE_COLOR}". No American odds in the quote. No invented defending champ or win counts. Do not restate the Event Blurb.
- Event Blurb: exactly one item, body only (no label). Two sentences in PGA TOUR press-office pamphlet voice, using only FACTS. Sentence one: the tour is traveling to the place for this field (size, and no-cut only if FACTS say so) at the course. Sentence two: one concrete course note from FACTS and who headlines the field from the player list. Official and plain. Not a sales line. Not the same point as the quote. A shared name is fine. A shared sentence is not.
- Best Players and Odds: 8–10 items from the list above. label must be exactly the "Name:" or "Name (+x):" / "Name (+low to +high):" prefix shown. body = one plain sentence, opinion/course-fit only — no invented history, majors, or odds.
- Course and Format: bullets only from FACTS (Course, Dates, Purse, Format, field size). Skip unknown fields.
- Never invent American odds, TV times, defending champion, season win counts, or venue lore.
- Use straight apostrophes.

JSON shape:
[{"title":"From the 19th Hole","items":[{"body":"...","attribution":"CutBot","color":"${DEFAULT_QUOTE_COLOR}"}]},{"title":"Event Blurb","items":[{"body":"..."}]}]
`;
}

export function datesFromGolfMetadata(golf: GolfEventMetadata | null): string | undefined {
  if (!golf?.startDate) return undefined;
  const start = new Date(golf.startDate);
  const end = golf.endDate ? new Date(golf.endDate) : null;
  if (!Number.isFinite(start.getTime())) return undefined;
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (!end || !Number.isFinite(end.getTime())) return fmt.format(start);
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}
