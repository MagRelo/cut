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
  odds: SourcedPlayerOdds | null;
};

export type EventSummaryContext = {
  eventName: string;
  pgaTourId?: string | undefined;
  overviewUrl?: string | undefined;
  course?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  displayDates?: string | undefined;
  purse?: number | null;
  format?: string | null;
  fieldSize: number;
  players: EventSummaryPlayer[];
  oddsEventName?: string | null;
  marketShape: string;
};

export function overviewUrlForPgaTourId(pgaTourId: string | undefined): string | undefined {
  if (!pgaTourId) return undefined;
  const year = /^R(\d{4})/.exec(pgaTourId)?.[1];
  if (!year) return undefined;
  return `https://www.pgatour.com/tournaments/${year}/overview/${pgaTourId}`;
}

function priceText(player: EventSummaryPlayer): string {
  const american = player.odds?.datagolf;
  if (american == null) return player.displayName;
  return `${player.displayName} (${formatAmericanOdds(american)})`;
}

export function buildMarketShape(players: EventSummaryPlayer[]): string {
  const priced = players.filter((player) => player.odds?.datagolf != null);
  const favorite = priced[0];
  if (!favorite) return "";
  const next = priced.slice(1, 4).map(priceText);
  const cluster = next.length > 0 ? ` Next: ${next.join(", ")}.` : "";
  return `Favorite: ${priceText(favorite)}.${cluster}`;
}

function factsBlock(ctx: EventSummaryContext): string {
  const lines = [
    `Tournament: ${ctx.eventName}`,
    ctx.pgaTourId ? `PGA Tour id: ${ctx.pgaTourId}` : null,
    ctx.overviewUrl ? `PGA Tour overview: ${ctx.overviewUrl}` : null,
    ctx.course ? `Course: ${ctx.course}` : null,
    ctx.city || ctx.state ? `Place: ${[ctx.city, ctx.state].filter(Boolean).join(", ")}` : null,
    ctx.displayDates ? `Dates: ${ctx.displayDates}` : null,
    ctx.purse != null ? `Purse: ${ctx.purse}` : null,
    ctx.format ? `Format: ${ctx.format}` : null,
    `Field size: ${ctx.fieldSize}`,
    ctx.oddsEventName ? `Sportsbook board: ${ctx.oddsEventName}` : null,
    ctx.marketShape ? `Market: ${ctx.marketShape}` : null,
  ];
  return lines.filter(Boolean).join("\n");
}

function playersBlock(ctx: EventSummaryContext): string {
  if (ctx.players.length === 0) return "(no priced players)";
  return ctx.players
    .map((player) => `- ${formatPlayerOddsLabel(player.displayName, player.odds?.datagolf)}`)
    .join("\n");
}

export function buildGolfEventSummaryPrompt(
  ctx: EventSummaryContext,
  retryReason?: string,
): string {
  const retry = retryReason
    ? `\nPREVIOUS OUTPUT WAS REJECTED: ${retryReason}\nFix that and output JSON only.\n`
    : "";

  return `You write the Play The Cut tournament preview for the announcement card and email. Make someone want to enter this week.
Output a JSON array only. No markdown, no commentary outside JSON.
${retry}
Look up this week's public reporting before you write. Start with the PGA Tour overview URL when one is listed, then check a few other current sources.

${factsBlock(ctx)}

PRICES (these labels are the odds; copy a label exactly when you include that player):
${playersBlock(ctx)}

Write the week, not a form sheet.
- "From the 19th Hole": one quote. attribution "${DEFAULT_CUTBOT_ATTRIBUTION}", color "${DEFAULT_QUOTE_COLOR}". The advertisement: the place, what's at stake, at most two names. The player list carries the prices.
- "Event Blurb": one item, body only. Two sentences. Where the tour is going, what the course is like, who the week is about.
- "Best Players and Odds": the players you can say something about, in the order above. Leave someone off if you have nothing to say. label is their price line. body is one sentence on why you'd pick them.
- "Course and Format": how the week plays.
- "Broadcast Information": only if you found the windows.
Use straight apostrophes.

JSON shape:
[{"title":"From the 19th Hole","items":[{"body":"...","attribution":"CutBot","color":"${DEFAULT_QUOTE_COLOR}"}]},{"title":"Event Blurb","items":[{"body":"..."}]},{"title":"Best Players and Odds","items":[{"label":"Player (+1100):","body":"..."}]},{"title":"Course and Format","items":[{"label":"Course:","body":"..."}]}]
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
