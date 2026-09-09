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

export { EmailKind, buildDedupeKey, EMAIL_SEND_STATUS } from "./types.js";
export type { EmailDedupeParams, RenderedEmail, EmailSendStatus } from "./types.js";
export { hasEmailBeenSent, recordEmailSend, sendIfNotLogged } from "./sendLog.js";
export type { SendIfNotLoggedResult } from "./sendLog.js";

export { renderSummarySectionsEmailHtml } from "./blocks/summary.js";

export {
  renderContestAnnouncementEmail,
  buildContestAnnouncementHtml,
  contestLobbyHref,
} from "./emails/contestAnnouncement.js";
export type { ContestAnnouncementEmailData } from "./emails/contestAnnouncement.js";
export { renderPlayerWithdrawalEmail, buildPlayerWithdrawalHtml } from "./emails/playerWithdrawal.js";
export type { PlayerWithdrawalEmailData } from "./emails/playerWithdrawal.js";

export {
  getActiveEventId,
  getAnyActiveEvent,
  loadEventForEmail,
  resolveEventIdForEmail,
} from "./data/event.js";

export { prepareEventAnnouncementEmail, prepareEventAnnouncementEmailSafe } from "./prepareEventAnnouncement.js";
export { loadContestAnnouncementSource } from "./data/contestAnnouncement.js";
export { loadLeagueEmailRecipients } from "./data/audience.js";

export {
  enqueueContestAnnouncementEmails,
  flushPendingContestAnnouncementEmails,
  scheduleContestAnnouncementEmails,
} from "./send/contestAnnouncement.js";

export {
  buildPreviewHtmlByKind,
  renderPreviewEmailByKind,
  PREVIEW_KINDS,
  type PreviewKind,
} from "./preview/render.js";
