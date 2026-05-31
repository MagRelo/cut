import { appPath } from "../appUrl.js";
import { renderContestListBlock, type ContestListItem } from "../blocks/contestList.js";
import { renderCtaBlock } from "../blocks/cta.js";
import { renderLockCountdownBlock } from "../blocks/lockCountdown.js";
import { renderProseBlock } from "../blocks/resultsTable.js";
import { escapeHtml } from "../escape.js";
import { BODY_SUBTITLE_STYLE, BODY_TITLE_H1_STYLE } from "../styles.js";
import { wrapEmailHtml } from "../templates.js";
import type { RenderedEmail } from "../types.js";

export type ReminderNoContestEmailData = {
  userName: string;
  tournamentName: string;
  lockLabel: string;
  openContests: ContestListItem[];
  groupNames: string[];
};

export function reminderNoContestSubject(data: ReminderNoContestEmailData): string {
  return `${data.tournamentName} — enter a contest`;
}

export function buildReminderNoContestHtml(data: ReminderNoContestEmailData): string {
  const greeting = data.userName.trim()
    ? `Hi ${escapeHtml(data.userName.trim())},`
    : "Hi there,";
  const groupsLine =
    data.groupNames.length > 0
      ? `Your leagues: ${data.groupNames.map((g) => escapeHtml(g)).join(", ")}.`
      : "";

  const bodyHtml = `<h1 style="${BODY_TITLE_H1_STYLE}">Still time to enter</h1>
<p style="${BODY_SUBTITLE_STYLE}">${escapeHtml(data.tournamentName)}</p>
${renderProseBlock(`${greeting} you have played recent tournaments but have not entered a contest this week.`)}
${groupsLine ? renderProseBlock(groupsLine) : ""}
${renderLockCountdownBlock(data.lockLabel)}
${renderContestListBlock("Open contests", data.openContests)}
${renderCtaBlock({ label: "Enter a contest", href: appPath("/contests") })}`;

  return wrapEmailHtml({ title: reminderNoContestSubject(data), bodyHtml });
}

export function renderReminderNoContestEmail(data: ReminderNoContestEmailData): RenderedEmail {
  return {
    subject: reminderNoContestSubject(data),
    html: buildReminderNoContestHtml(data),
  };
}
