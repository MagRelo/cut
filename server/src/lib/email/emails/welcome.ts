import { appPath } from "../appUrl.js";
import { renderCtaBlock } from "../blocks/cta.js";
import { renderProseBlock } from "../blocks/resultsTable.js";
import { escapeHtml } from "../escape.js";
import { BODY_TITLE_H1_STYLE } from "../styles.js";
import { wrapEmailHtml } from "../templates.js";
import type { RenderedEmail } from "../types.js";

export type WelcomeEmailData = {
  userName: string;
  tournamentName?: string;
};

export function welcomeSubject(): string {
  return "Welcome to Play The Cut";
}

export function buildWelcomeHtml(data: WelcomeEmailData): string {
  const greeting = data.userName.trim() ? `Hi ${escapeHtml(data.userName.trim())},` : "Hi there,";
  const tournamentLine = data.tournamentName
    ? `This week: <strong>${escapeHtml(data.tournamentName)}</strong> is live on Play The Cut.`
    : "Pick a lineup, enter a contest, and follow live Stableford scoring all week.";

  const bodyHtml = `<h1 style="${BODY_TITLE_H1_STYLE}">Welcome to Play The Cut</h1>
${renderProseBlock(`${greeting} thanks for joining.`)}
${renderProseBlock(tournamentLine)}
${renderProseBlock("Build a four-player lineup for the active tournament, then enter an open contest with your group or the public lobby.")}
${renderCtaBlock({ label: "Go to Play The Cut", href: appPath("/") })}
${renderProseBlock("Fund your account from Settings when you are ready to enter paid contests.")}`;

  return wrapEmailHtml({ title: welcomeSubject(), bodyHtml });
}

export function renderWelcomeEmail(data: WelcomeEmailData): RenderedEmail {
  return { subject: welcomeSubject(), html: buildWelcomeHtml(data) };
}
