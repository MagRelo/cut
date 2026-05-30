import { appPath } from "../appUrl.js";
import { renderCtaBlock } from "../blocks/cta.js";
import { renderProseBlock } from "../blocks/resultsTable.js";
import { escapeHtml } from "../escape.js";
import { BODY_SUBTITLE_STYLE, BODY_TITLE_H1_STYLE } from "../styles.js";
import { wrapEmailHtml } from "../templates.js";
import type { RenderedEmail } from "../types.js";

export type PlayerWithdrawalEmailData = {
  tournamentName: string;
  playerName: string;
  lineupNames: string[];
};

export function playerWithdrawalSubject(data: PlayerWithdrawalEmailData): string {
  return `${data.tournamentName} — ${data.playerName} withdrew`;
}

function formatLineupNames(lineupNames: string[]): string {
  if (lineupNames.length === 0) return "your lineup";
  if (lineupNames.length === 1) return `"${lineupNames[0]}"`;
  return lineupNames.map((name) => `"${name}"`).join(", ");
}

export function buildPlayerWithdrawalHtml(data: PlayerWithdrawalEmailData): string {
  const lineupLabel = formatLineupNames(data.lineupNames.map((name) => escapeHtml(name)));

  const bodyHtml = `<h1 style="${BODY_TITLE_H1_STYLE}">Player withdrew</h1>
<p style="${BODY_SUBTITLE_STYLE}">${escapeHtml(data.tournamentName)}</p>
${renderProseBlock(
  `${escapeHtml(data.playerName)} has withdrawn from this week's tournament.`,
)}
${renderProseBlock(
  `We removed them from ${lineupLabel}. Please pick a replacement before lineups lock.`,
)}
${renderCtaBlock({ label: "Update your lineups", href: appPath("/lineups") })}`;

  return wrapEmailHtml({ title: playerWithdrawalSubject(data), bodyHtml });
}

export function renderPlayerWithdrawalEmail(data: PlayerWithdrawalEmailData): RenderedEmail {
  return {
    subject: playerWithdrawalSubject(data),
    html: buildPlayerWithdrawalHtml(data),
  };
}
