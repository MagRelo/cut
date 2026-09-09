import type { EmailAnnouncementContent } from "@cut/sport-sdk";
import { appPath } from "../appUrl.js";
import { renderCtaBlock } from "../blocks/cta.js";
import {
  announcementDataFromContent,
  renderEventAnnouncementHtml,
} from "../blocks/eventAnnouncement.js";
import { renderProseBlock } from "../blocks/resultsTable.js";
import {
  renderBodySummarySectionsHtml,
  renderLeadSummarySectionsHtml,
} from "../blocks/summary.js";
import { escapeHtml } from "../escape.js";
import { SECTION_TITLE_STYLE } from "../styles.js";
import { wrapEmailHtml } from "../templates.js";
import type { RenderedEmail } from "../types.js";

export type ContestAnnouncementEmailData = {
  eventName: string;
  leagueName: string;
  buyInLabel: string;
  contestHref: string;
  announcement: EmailAnnouncementContent;
};

export function contestAnnouncementSubject(data: ContestAnnouncementEmailData): string {
  return `${data.leagueName}: ${data.eventName}`;
}

function renderContestHeaderHtml(data: ContestAnnouncementEmailData): string {
  return `<div style="margin:0 0 24px;">
<h2 style="${SECTION_TITLE_STYLE}">${escapeHtml(data.leagueName)} opened a contest</h2>
${renderProseBlock(`Buy-in: ${data.buyInLabel}`)}
</div>`;
}

export function buildContestAnnouncementBodyHtml(data: ContestAnnouncementEmailData): string {
  const announcementHtml = renderEventAnnouncementHtml(
    announcementDataFromContent(data.eventName, data.announcement),
  );
  const leadHtml = renderLeadSummarySectionsHtml(data.announcement.leadSections);
  const bodySections = data.announcement.bodySections;
  const topSectionsHtml = renderBodySummarySectionsHtml(bodySections.slice(0, 1));
  const bottomSectionsHtml = renderBodySummarySectionsHtml(bodySections.slice(1));

  return `${renderContestHeaderHtml(data)}
${announcementHtml}
${leadHtml}
${topSectionsHtml}
${renderCtaBlock({ label: "Open contest", href: data.contestHref }, { margin: "24px 0 36px" })}
${bottomSectionsHtml}
${bottomSectionsHtml.trim() ? renderCtaBlock({ label: "Open contest", href: data.contestHref }, { margin: "0 0 20px" }) : ""}
`;
}

export function buildContestAnnouncementHtml(data: ContestAnnouncementEmailData): string {
  return wrapEmailHtml({
    title: data.eventName,
    bodyHtml: buildContestAnnouncementBodyHtml(data),
  });
}

export function renderContestAnnouncementEmail(data: ContestAnnouncementEmailData): RenderedEmail {
  return {
    subject: contestAnnouncementSubject(data),
    html: buildContestAnnouncementHtml(data),
  };
}

export function contestLobbyHref(contest: { id: string; address?: string | null }): string {
  const address = contest.address?.trim();
  const key = address ? address.toLowerCase() : contest.id;
  return appPath(`/contest/${key}`);
}
