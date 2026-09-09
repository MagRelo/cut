import { buildTestEmailHtml } from "../templates.js";
import { renderContestAnnouncementEmail } from "../emails/contestAnnouncement.js";
import { renderPlayerWithdrawalEmail } from "../emails/playerWithdrawal.js";
import type { RenderedEmail } from "../types.js";
import { appendUnsubscribeFooter } from "../unsubscribe.js";
import {
  fixtureContestAnnouncement,
  fixturePlayerWithdrawal,
  type PreviewKind,
} from "./fixtures.js";

export { PREVIEW_KINDS, type PreviewKind } from "./fixtures.js";

const TEST_EMAIL_SUBJECT = "Play The Cut — test email";
const PREVIEW_EMAIL = "preview@playthecut.com";

export async function renderPreviewEmailByKind(kind: PreviewKind): Promise<RenderedEmail> {
  switch (kind) {
    case "contest-announcement":
      return renderContestAnnouncementEmail(await fixtureContestAnnouncement());
    case "player-withdrawal":
      return renderPlayerWithdrawalEmail(fixturePlayerWithdrawal());
    case "minimal":
      return { subject: TEST_EMAIL_SUBJECT, html: buildTestEmailHtml() };
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Unknown kind: ${_exhaustive}`);
    }
  }
}

export async function buildPreviewHtmlByKind(kind: PreviewKind): Promise<string> {
  const { html } = await renderPreviewEmailByKind(kind);
  if (kind === "player-withdrawal") {
    return html;
  }
  return appendUnsubscribeFooter(html, PREVIEW_EMAIL);
}
