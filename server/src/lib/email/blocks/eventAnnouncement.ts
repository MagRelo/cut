import type { EmailAnnouncementContent } from "@cut/sport-sdk";
import { escapeHtml } from "../escape.js";
import {
  ANNOUNCEMENT_DESCRIPTION_STYLE,
  BODY_DATE_LINE_TIGHT_STYLE,
  BODY_META_LINE_STYLE,
  BODY_TITLE_H1_STYLE,
  CONTEST_META_LABEL_STYLE,
  CONTEST_META_VALUE_STYLE,
  SECTION_TITLE_STYLE,
} from "../styles.js";

const ANNOUNCEMENT_EYEBROW = "New contest";

const ANNOUNCEMENT_CARD_STYLE =
  "border:1px solid #cbd5e1;border-radius:8px;padding:16px 18px;background:#ffffff;";

export type EventAnnouncementData = {
  tournamentName: string;
  courseLine: string;
  dateLine: string;
  blurb: string | null;
  leagueName?: string;
  memberCount?: number;
  buyInLabel?: string;
};

export function announcementDataFromContent(
  eventName: string,
  content: EmailAnnouncementContent,
  contest?: { leagueName: string; buyInLabel: string; memberCount?: number },
): EventAnnouncementData {
  return {
    tournamentName: eventName,
    courseLine: content.courseLine,
    dateLine: content.dateLine,
    blurb: content.blurb,
    ...(contest?.leagueName !== undefined ? { leagueName: contest.leagueName } : {}),
    ...(contest?.memberCount !== undefined ? { memberCount: contest.memberCount } : {}),
    ...(contest?.buyInLabel !== undefined ? { buyInLabel: contest.buyInLabel } : {}),
  };
}

function formatMemberCount(count: number | undefined): string {
  if (count == null || !Number.isFinite(count) || count < 0) return "";
  return String(Math.floor(count));
}

function renderContestFactHtml(label: string, value: string): string {
  if (!value) return "";
  return `<p style="${CONTEST_META_LABEL_STYLE}">${escapeHtml(label)}</p>
<p style="${CONTEST_META_VALUE_STYLE}">${escapeHtml(value)}</p>`;
}

function renderContestMetaRowHtml(data: EventAnnouncementData): string {
  const league = data.leagueName?.trim() ?? "";
  const members = formatMemberCount(data.memberCount);
  const buyIn = data.buyInLabel?.trim() ?? "";
  const facts = [
    renderContestFactHtml("League", league),
    renderContestFactHtml("Members", members),
    renderContestFactHtml("Buy-in", buyIn),
  ].filter(Boolean);
  if (facts.length === 0) return "";

  const cells = facts
    .map((fact, index) => {
      const padding = index === 0 ? "12px 12px 0 0" : "12px 0 0 12px";
      return `<td style="padding:${padding};vertical-align:top;width:${Math.round(100 / facts.length)}%;">${fact}</td>`;
    })
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 0;border-top:1px solid #e2e8f0;">
  <tr>
    ${cells}
  </tr>
</table>`;
}

/** Announcement card: contest + event header + blurb prose (email). */
export function renderEventAnnouncementHtml(data: EventAnnouncementData): string {
  const courseHtml = data.courseLine.trim()
    ? `<p style="${BODY_META_LINE_STYLE}">${escapeHtml(data.courseLine.trim())}</p>`
    : "";
  const dateHtml = data.dateLine.trim()
    ? `<p style="${BODY_DATE_LINE_TIGHT_STYLE}">${escapeHtml(data.dateLine.trim())}</p>`
    : "";
  const descriptionHtml = data.blurb
    ? `<p style="${ANNOUNCEMENT_DESCRIPTION_STYLE}">${escapeHtml(data.blurb)}</p>`
    : "";
  const contestMetaHtml = renderContestMetaRowHtml(data);

  return `<div style="margin:0 0 28px;">
<h2 style="${SECTION_TITLE_STYLE}">${escapeHtml(ANNOUNCEMENT_EYEBROW)}</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;">
  <tr>
    <td style="${ANNOUNCEMENT_CARD_STYLE}">
      <h1 style="${BODY_TITLE_H1_STYLE}">${escapeHtml(data.tournamentName)}</h1>
      ${courseHtml}
      ${dateHtml}
      ${descriptionHtml}
      ${contestMetaHtml}
    </td>
  </tr>
</table>
</div>`;
}
