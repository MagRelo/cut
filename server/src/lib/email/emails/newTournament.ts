import type { EmailAnnouncementContent } from "@cut/sport-sdk";
import { appPath } from "../appUrl.js";
import { renderCtaBlock } from "../blocks/cta.js";
import {
  announcementDataFromContent,
  renderEventAnnouncementHtml,
} from "../blocks/eventAnnouncement.js";
import {
  renderBodySummarySectionsHtml,
  renderLeadSummarySectionsHtml,
} from "../blocks/summary.js";
import { wrapEmailHtml } from "../templates.js";
import type { RenderedEmail } from "../types.js";

export type NewTournamentEmailData = {
  tournamentName: string;
  sportId: string;
  announcement: EmailAnnouncementContent;
};

export function newTournamentSubject(data: NewTournamentEmailData): string {
  return `New Contests: ${data.tournamentName}`;
}

export function buildNewTournamentBodyHtml(data: NewTournamentEmailData): string {
  const announcementHtml = renderEventAnnouncementHtml(
    announcementDataFromContent(data.tournamentName, data.announcement),
  );
  const leadHtml = renderLeadSummarySectionsHtml(data.announcement.leadSections);
  const bodySections = data.announcement.bodySections;
  const topSectionsHtml = renderBodySummarySectionsHtml(bodySections.slice(0, 1));
  const bottomSectionsHtml = renderBodySummarySectionsHtml(bodySections.slice(1));

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
