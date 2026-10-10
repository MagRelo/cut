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

/** Event card photo strip at `sm:h-44` (11rem). */
const EVENT_HEADER_IMAGE_HEIGHT_PX = 176;

export type EventAnnouncementData = {
  tournamentName: string;
  courseLine: string;
  dateLine: string;
  blurb: string | null;
  leagueName?: string;
  memberCount?: number;
  buyInLabel?: string;
  headerImageUrl?: string | null;
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
    ...(content.headerImageUrl ? { headerImageUrl: content.headerImageUrl } : {}),
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

const WEEK_SIGN_OFF_BOLD = "this week on Planet Earth.";

function emphasizeSignOff(text: string): string {
  const emphasis = `<strong style="font-weight:700;">${WEEK_SIGN_OFF_BOLD}</strong>`;
  return escapeHtml(text).split(WEEK_SIGN_OFF_BOLD).join(emphasis);
}

function renderBlurbHtml(blurb: string): string {
  const paragraphs = blurb
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const [first, ...rest] = paragraphs;
  const inner = `${emphasizeSignOff(first ?? "")}${rest
    .map((part) => `<br><br>${emphasizeSignOff(part)}`)
    .join("")}`;
  return `<p style="${ANNOUNCEMENT_DESCRIPTION_STYLE}">${inner}</p>`;
}

/** Announcement card: contest + event header + blurb prose (email). */
export function renderEventAnnouncementHtml(data: EventAnnouncementData): string {
  const courseHtml = data.courseLine.trim()
    ? `<p style="${BODY_META_LINE_STYLE}">${escapeHtml(data.courseLine.trim())}</p>`
    : "";
  const dateHtml = data.dateLine.trim()
    ? `<p style="${BODY_DATE_LINE_TIGHT_STYLE}">${escapeHtml(data.dateLine.trim())}</p>`
    : "";
  const descriptionHtml = data.blurb ? renderBlurbHtml(data.blurb) : "";
  const contestMetaHtml = renderContestMetaRowHtml(data);
  const copyHtml = `<h1 style="${BODY_TITLE_H1_STYLE}">${escapeHtml(data.tournamentName)}</h1>
      ${courseHtml}
      ${dateHtml}
      ${descriptionHtml}
      ${contestMetaHtml}`;
  const headerImageUrl = data.headerImageUrl?.trim() ?? "";
  const cardInner = headerImageUrl
    ? `<tr>
    <td style="padding:0;line-height:0;font-size:0;">
      <img src="${escapeHtml(headerImageUrl)}" alt="" width="504" height="${EVENT_HEADER_IMAGE_HEIGHT_PX}" style="display:block;width:100%;max-width:504px;height:${EVENT_HEADER_IMAGE_HEIGHT_PX}px;object-fit:cover;object-position:center;border:0;border-radius:8px 8px 0 0;" />
    </td>
  </tr>
  <tr>
    <td style="padding:16px 18px;">
      ${copyHtml}
    </td>
  </tr>`
    : `<tr>
    <td style="${ANNOUNCEMENT_CARD_STYLE}">
      ${copyHtml}
    </td>
  </tr>`;
  const tableStyle = headerImageUrl
    ? "margin:0;border:1px solid #cbd5e1;border-radius:8px;background:#ffffff;"
    : "margin:0;";

  return `<div style="margin:0 0 28px;">
<h2 style="${SECTION_TITLE_STYLE}">${escapeHtml(ANNOUNCEMENT_EYEBROW)}</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${tableStyle}">
  ${cardInner}
</table>
</div>`;
}
