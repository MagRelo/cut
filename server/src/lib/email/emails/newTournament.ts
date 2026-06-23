import { appPath } from "../appUrl.js";
import { renderCtaBlock } from "../blocks/cta.js";
import { renderLeadSummarySectionHtml, renderSummarySectionByKeyHtml } from "../blocks/summary.js";
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
  const subtitleHtml = data.subtitle.trim()
    ? `<p style="${BODY_SUBTITLE_STYLE}">${escapeHtml(data.subtitle.trim())}</p>`
    : "";
  const leadHtml = renderLeadSummarySectionHtml(data.summarySections);
  const sectionKeyOrder = [
    "Best Players and Odds",
    "Tournament History",
    "Course and Format",
    "Broadcast Information",
  ] as const;
  const renderedSections = sectionKeyOrder
    .map((key) => renderSummarySectionByKeyHtml(data.summarySections, key))
    .filter((html) => html.length > 0);
  const topSectionsHtml = renderedSections.slice(0, 1).join("");
  const bottomSectionsHtml = renderedSections.slice(1).join("");

  return `<h1 style="${BODY_TITLE_H1_STYLE}">${escapeHtml(data.tournamentName)}</h1>
${subtitleHtml}
${leadHtml}
${topSectionsHtml}
${renderCtaBlock({ label: "Build your lineup", href: appPath("/contests") }, { margin: "24px 0 36px" })}
${bottomSectionsHtml}
${renderCtaBlock({ label: "Browse open contests", href: appPath("/contests") }, { margin: "0 0 20px" })}
`;
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
