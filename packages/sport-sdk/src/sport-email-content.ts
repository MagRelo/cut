/** Sport-owned copy/metadata for transactional emails. */

export type EmailAnnouncementSectionItem = {
  body: string;
  label?: string;
  attribution?: string;
  color?: string;
};

export type EmailAnnouncementSection = {
  /** Stable key for ordering / lookup (e.g. "Best Players and Odds") */
  key: string;
  title: string;
  kind: "quotes" | "bullets" | "prose";
  items: EmailAnnouncementSectionItem[];
};

export type EmailAnnouncementContent = {
  /** Course · place (or sport-equivalent meta line) */
  courseLine: string;
  /** Date range line */
  dateLine: string;
  /** Short blurb under the event header */
  blurb: string | null;
  /** Lead block (e.g. quotes) */
  leadSections: EmailAnnouncementSection[];
  /** Remaining ordered body sections for new-event email */
  bodySections: EmailAnnouncementSection[];
};

export type EmailEventShell = {
  sportId: string;
  externalId: string;
  name: string;
  /** Raw CompetitionEvent.metadata — sports parse their own nested blocks */
  metadata: unknown;
};

export interface SportEmailContent {
  readonly sportId: string;

  /**
   * Single-line subtitle for recap / reminder-style meta rows.
   */
  formatEventSubtitle(event: EmailEventShell): string;

  /**
   * Full announcement payload for contest-announcement email.
   */
  loadAnnouncementContent(event: EmailEventShell): Promise<EmailAnnouncementContent>;

  /**
   * Optional sport-flavored welcome paragraph when an active event exists.
   * Return null → platform uses generic fallback copy.
   */
  welcomeProductBlurb?(ctx: { eventName?: string }): string | null;
}
