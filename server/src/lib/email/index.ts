export type { EmailOptions } from "./transport.js";
export {
  isEmailConfigured,
  sendEmail,
  sendPreviewEmail,
  sendSampleEmail,
  sendTestEmail,
} from "./transport.js";

export { escapeHtml } from "./escape.js";
export { getAppPublicUrl, appPath } from "./appUrl.js";
export { buildTestEmailHtml, getEmailLogoUrl, wrapEmailHtml } from "./templates.js";

export { EmailKind, buildDedupeKey } from "./types.js";
export type { EmailDedupeParams, RenderedEmail } from "./types.js";
export {
  hasEmailBeenSent,
  hasBroadcastBeenSent,
  recordEmailSend,
  sendIfNotLogged,
} from "./sendLog.js";
export type { SendIfNotLoggedResult } from "./sendLog.js";

export { renderSummarySectionsEmailHtml } from "./blocks/summary.js";

export { renderWelcomeEmail, buildWelcomeHtml } from "./emails/welcome.js";
export type { WelcomeEmailData } from "./emails/welcome.js";
export { renderNewTournamentEmail, buildNewTournamentHtml } from "./emails/newTournament.js";
export type { NewTournamentEmailData } from "./emails/newTournament.js";
export { renderReminderNoContestEmail } from "./emails/reminderNoContest.js";
export type { ReminderNoContestEmailData } from "./emails/reminderNoContest.js";
export { renderTournamentRecapEmail } from "./emails/tournamentRecap.js";
export type { TournamentRecapEmailData } from "./emails/tournamentRecap.js";
export { renderBehindTheScenesEmail } from "./emails/behindTheScenes.js";
export type { BehindTheScenesEmailData } from "./emails/behindTheScenes.js";
export { renderPlayerWithdrawalEmail, buildPlayerWithdrawalHtml } from "./emails/playerWithdrawal.js";
export type { PlayerWithdrawalEmailData } from "./emails/playerWithdrawal.js";

export { getManualActiveTournamentId, loadTournamentForEmail } from "./data/tournament.js";

export { sendWelcomeBlast } from "./send/welcome.js";
export { sendNewTournamentBlast } from "./send/newTournament.js";
export { sendReminderNoContestBlast } from "./send/reminder.js";
export { sendTournamentRecapBlast } from "./send/recap.js";
export { sendBehindTheScenesBlast } from "./send/behindTheScenes.js";

export {
  buildPreviewHtmlByKind,
  renderPreviewEmailByKind,
  PREVIEW_KINDS,
  type PreviewKind,
} from "./preview/render.js";
