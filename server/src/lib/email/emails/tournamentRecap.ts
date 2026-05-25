import { appPath } from "../appUrl.js";
import { renderCtaBlock } from "../blocks/cta.js";
import {
  renderProseBlock,
  renderResultsTableBlock,
  type ResultsRow,
} from "../blocks/resultsTable.js";
import { escapeHtml } from "../escape.js";
import { BODY_SUBTITLE_STYLE, BODY_TITLE_H1_STYLE } from "../styles.js";
import { wrapEmailHtml } from "../templates.js";
import type { RenderedEmail } from "../types.js";

export type TournamentRecapEmailData = {
  tournamentName: string;
  subtitle: string;
  /** Global highlights (winners, field notes) */
  highlights: ResultsRow[];
  /** Per-recipient; omit for broadcast-only recap */
  personalResults?: ResultsRow[];
  nextWeekTeaser?: string;
};

export function tournamentRecapSubject(data: TournamentRecapEmailData): string {
  return `${data.tournamentName} — week in review`;
}

export function buildTournamentRecapHtml(data: TournamentRecapEmailData): string {
  const subtitleHtml = data.subtitle.trim()
    ? `<p style="${BODY_SUBTITLE_STYLE}">${escapeHtml(data.subtitle.trim())}</p>`
    : "";

  const personalBlock =
    data.personalResults && data.personalResults.length > 0
      ? renderResultsTableBlock("Your week", data.personalResults)
      : "";

  const teaser = data.nextWeekTeaser ? renderProseBlock(data.nextWeekTeaser) : "";

  const bodyHtml = `<h1 style="${BODY_TITLE_H1_STYLE}">${escapeHtml(data.tournamentName)} recap</h1>
${subtitleHtml}
${renderProseBlock("The tournament is in the books. Here is how the week shook out on Play The Cut.")}
${renderResultsTableBlock("Highlights", data.highlights)}
${personalBlock}
${teaser}
${renderCtaBlock({ label: "View results", href: appPath("/") })}`;

  return wrapEmailHtml({ title: tournamentRecapSubject(data), bodyHtml });
}

export function renderTournamentRecapEmail(data: TournamentRecapEmailData): RenderedEmail {
  return {
    subject: tournamentRecapSubject(data),
    html: buildTournamentRecapHtml(data),
  };
}
