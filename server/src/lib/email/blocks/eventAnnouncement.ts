import type { EmailAnnouncementContent } from "@cut/sport-sdk";
import { escapeHtml } from "../escape.js";
import {
  ANNOUNCEMENT_DESCRIPTION_STYLE,
  BODY_DATE_LINE_TIGHT_STYLE,
  BODY_META_LINE_STYLE,
  BODY_TITLE_H1_STYLE,
  SECTION_TITLE_STYLE,
} from "../styles.js";

const ANNOUNCEMENT_EYEBROW = "New event available:";

const ANNOUNCEMENT_CARD_STYLE =
  "border:1px solid #cbd5e1;border-radius:8px;padding:16px 18px;background:#ffffff;";

export type EventAnnouncementData = {
  tournamentName: string;
  courseLine: string;
  dateLine: string;
  blurb: string | null;
};

export function announcementDataFromContent(
  eventName: string,
  content: EmailAnnouncementContent,
): EventAnnouncementData {
  return {
    tournamentName: eventName,
    courseLine: content.courseLine,
    dateLine: content.dateLine,
    blurb: content.blurb,
  };
}

/** Announcement card: event header + blurb prose (email). */
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

  return `<div style="margin:0 0 28px;">
<h2 style="${SECTION_TITLE_STYLE}">${escapeHtml(ANNOUNCEMENT_EYEBROW)}</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;">
  <tr>
    <td style="${ANNOUNCEMENT_CARD_STYLE}">
      <h1 style="${BODY_TITLE_H1_STYLE}">${escapeHtml(data.tournamentName)}</h1>
      ${courseHtml}
      ${dateHtml}
      ${descriptionHtml}
    </td>
  </tr>
</table>
</div>`;
}
