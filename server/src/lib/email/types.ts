/** Matches idempotency keys in docs/email-program.md */
export enum EmailKind {
  WELCOME = "WELCOME",
  NEW_TOURNAMENT = "NEW_TOURNAMENT",
  REMINDER_NO_CONTEST = "REMINDER_NO_CONTEST",
  TOURNAMENT_RECAP = "TOURNAMENT_RECAP",
  BEHIND_THE_SCENES = "BEHIND_THE_SCENES",
}

export type EmailDedupeParams = {
  userId?: string;
  tournamentId?: string;
  campaignId?: string;
};

export function buildDedupeKey(kind: EmailKind, params: EmailDedupeParams): string {
  switch (kind) {
    case EmailKind.WELCOME:
      if (!params.userId) throw new Error("WELCOME requires userId");
      return `${kind}:${params.userId}`;
    case EmailKind.NEW_TOURNAMENT:
    case EmailKind.TOURNAMENT_RECAP:
      if (!params.tournamentId) throw new Error(`${kind} requires tournamentId`);
      if (params.userId) return `${kind}:${params.tournamentId}:${params.userId}`;
      return `${kind}:${params.tournamentId}`;
    case EmailKind.REMINDER_NO_CONTEST:
      if (!params.tournamentId || !params.userId) {
        throw new Error("REMINDER_NO_CONTEST requires tournamentId and userId");
      }
      return `${kind}:${params.tournamentId}:${params.userId}`;
    case EmailKind.BEHIND_THE_SCENES:
      if (!params.campaignId) throw new Error("BEHIND_THE_SCENES requires campaignId");
      return `${kind}:${params.campaignId}`;
    default:
      throw new Error(`Unknown email kind: ${kind}`);
  }
}

export type RenderedEmail = {
  subject: string;
  html: string;
};
