import { appPath } from "../appUrl.js";
import { renderCtaBlock } from "../blocks/cta.js";
import { renderSummarySectionsEmailHtml } from "../blocks/summary.js";
import { escapeHtml } from "../escape.js";
import { BODY_SUBTITLE_STYLE, BODY_TITLE_H1_STYLE } from "../styles.js";
import { wrapEmailHtml } from "../templates.js";
import type { RenderedEmail } from "../types.js";
import type { TournamentSummarySections } from "../../tournamentSummary.js";

export type NewTournamentEmailData = {
  tournamentName: string;
  subtitle: string;
  summarySections: TournamentSummarySections | null;
};

export function newTournamentSubject(data: NewTournamentEmailData): string {
  return data.tournamentName;
}

export function buildNewTournamentBodyHtml(data: NewTournamentEmailData): string {
  const summaryHtml = renderSummarySectionsEmailHtml(data.summarySections);
  const subtitleHtml = data.subtitle.trim()
    ? `<p style="${BODY_SUBTITLE_STYLE}">${escapeHtml(data.subtitle.trim())}</p>`
    : "";

  return `<h1 style="${BODY_TITLE_H1_STYLE}">${escapeHtml(data.tournamentName)}</h1>
${subtitleHtml}
${summaryHtml}
${renderCtaBlock({ label: "Build your lineup", href: appPath("/") })}
${renderCtaBlock({ label: "Browse open contests", href: appPath("/contests") })}`;
}

export function buildNewTournamentHtml(data: NewTournamentEmailData): string {
  return wrapEmailHtml({
    title: data.tournamentName,
    bodyHtml: buildNewTournamentBodyHtml(data),
  });
}

export function renderNewTournamentEmail(data: NewTournamentEmailData): RenderedEmail {
  return {
    subject: newTournamentSubject(data),
    html: buildNewTournamentHtml(data),
  };
}
