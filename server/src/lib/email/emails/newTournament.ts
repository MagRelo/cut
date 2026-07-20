import { appPath } from "../appUrl.js";
import { renderCtaBlock } from "../blocks/cta.js";
import { renderEventAnnouncementHtml } from "../blocks/eventAnnouncement.js";
import { renderLeadSummarySectionHtml, renderSummarySectionByKeyHtml } from "../blocks/summary.js";
import { wrapEmailHtml } from "../templates.js";
import type { RenderedEmail } from "../types.js";
import type { TournamentSummarySections } from "../../tournamentSummary.js";

export type NewTournamentEmailData = {
  tournamentName: string;
  /** "TPC Twin Cities · Blaine, Minnesota" */
  courseLine: string;
  /** "Jul 23–Jul 26, 2026" */
  dateLine: string;
  summarySections: TournamentSummarySections | null;
};

export function newTournamentSubject(data: NewTournamentEmailData): string {
  return `New Contests: ${data.tournamentName}`;
}

export function buildNewTournamentBodyHtml(data: NewTournamentEmailData): string {
  const announcementHtml = renderEventAnnouncementHtml({
    tournamentName: data.tournamentName,
    courseLine: data.courseLine,
    dateLine: data.dateLine,
    summarySections: data.summarySections,
  });
  const leadHtml = renderLeadSummarySectionHtml(data.summarySections);
  // Event Blurb is shown in the announcement card (not as its own bullet section).
  const sectionKeyOrder = [
    "Best Players and Odds",
    "Course and Format",
    "Broadcast Information",
  ] as const;
  const renderedSections = sectionKeyOrder
    .map((key) => renderSummarySectionByKeyHtml(data.summarySections, key))
    .filter((html) => html.length > 0);
  const topSectionsHtml = renderedSections.slice(0, 1).join("");
  const bottomSectionsHtml = renderedSections.slice(1).join("");

  return `${announcementHtml}
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
