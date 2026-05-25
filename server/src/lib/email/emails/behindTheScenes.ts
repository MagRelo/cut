import { renderCtaBlock } from "../blocks/cta.js";
import { renderProseBlock } from "../blocks/resultsTable.js";
import { escapeHtml } from "../escape.js";
import { BODY_TITLE_H1_STYLE } from "../styles.js";
import { wrapEmailHtml } from "../templates.js";
import type { RenderedEmail } from "../types.js";
import { appPath } from "../appUrl.js";

export type BehindTheScenesEmailData = {
  campaignLabel: string;
  /** HTML-safe body paragraphs (plain text escaped) or raw HTML from BTS_EMAIL_BODY_HTML */
  bodyParagraphs: string[];
  useRawHtml?: boolean;
};

export function behindTheScenesSubject(data: BehindTheScenesEmailData): string {
  return `Play The Cut — ${data.campaignLabel}`;
}

export function buildBehindTheScenesHtml(data: BehindTheScenesEmailData): string {
  const bodyContent = data.useRawHtml
    ? data.bodyParagraphs.join("\n")
    : data.bodyParagraphs.map((p) => renderProseBlock(p)).join("\n");

  const bodyHtml = `<h1 style="${BODY_TITLE_H1_STYLE}">Behind the scenes</h1>
<p style="margin:0 0 16px;font-size:13px;color:#71717a;">${escapeHtml(data.campaignLabel)}</p>
${bodyContent}
${renderCtaBlock({ label: "Open Play The Cut", href: appPath("/") })}
${renderProseBlock("Reply with feedback — we read every note.")}`;

  return wrapEmailHtml({ title: behindTheScenesSubject(data), bodyHtml });
}

export function renderBehindTheScenesEmail(data: BehindTheScenesEmailData): RenderedEmail {
  return {
    subject: behindTheScenesSubject(data),
    html: buildBehindTheScenesHtml(data),
  };
}

/** Default copy when operator does not set BTS_EMAIL_BODY_HTML. */
export const DEFAULT_BTS_PARAGRAPHS = [
  "Thanks for being part of Play The Cut. This note is our occasional build-in-public digest: what shipped, what we are fixing, and what is next.",
  "Tournament-week emails cover the event and your contests. This monthly note is the wider product picture — not tied to a single tee time.",
];
