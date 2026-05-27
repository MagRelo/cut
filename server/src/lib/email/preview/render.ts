import { buildTestEmailHtml } from "../templates.js";
import { renderBehindTheScenesEmail } from "../emails/behindTheScenes.js";
import { renderNewTournamentEmail } from "../emails/newTournament.js";
import { renderReminderNoContestEmail } from "../emails/reminderNoContest.js";
import { renderTournamentRecapEmail } from "../emails/tournamentRecap.js";
import { renderWelcomeEmail } from "../emails/welcome.js";
import type { RenderedEmail } from "../types.js";
import { appendUnsubscribeFooter } from "../unsubscribe.js";
import {
  fixtureBehindTheScenes,
  fixtureNewTournament,
  fixtureRecap,
  fixtureReminder,
  fixtureWelcome,
  type PreviewKind,
} from "./fixtures.js";

export { PREVIEW_KINDS, type PreviewKind } from "./fixtures.js";

const TEST_EMAIL_SUBJECT = "Play The Cut — test email";
const PREVIEW_EMAIL = "preview@playthecut.com";

export async function renderPreviewEmailByKind(kind: PreviewKind): Promise<RenderedEmail> {
  switch (kind) {
    case "welcome":
      return renderWelcomeEmail(fixtureWelcome());
    case "new-tournament":
      return renderNewTournamentEmail(await fixtureNewTournament());
    case "reminder":
      return renderReminderNoContestEmail(fixtureReminder());
    case "recap":
      return renderTournamentRecapEmail(fixtureRecap());
    case "behind-the-scenes":
      return renderBehindTheScenesEmail(fixtureBehindTheScenes());
    case "minimal":
      return { subject: TEST_EMAIL_SUBJECT, html: buildTestEmailHtml() };
    default:
      throw new Error(`Unknown preview kind: ${kind}`);
  }
}

export async function buildPreviewHtmlByKind(kind: PreviewKind): Promise<string> {
  const { html } = await renderPreviewEmailByKind(kind);
  return appendUnsubscribeFooter(html, PREVIEW_EMAIL);
}
