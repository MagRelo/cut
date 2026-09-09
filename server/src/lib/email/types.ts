/** Matches idempotency keys in docs/operations/email-program.md */
export enum EmailKind {
  CONTEST_ANNOUNCEMENT = "CONTEST_ANNOUNCEMENT",
  PLAYER_WITHDRAWAL = "PLAYER_WITHDRAWAL",
}

export type EmailDedupeParams = {
  userId?: string;
  eventId?: string;
  contestId?: string;
  campaignId?: string;
  playerId?: string;
};

export function buildDedupeKey(kind: EmailKind, params: EmailDedupeParams): string {
  switch (kind) {
    case EmailKind.CONTEST_ANNOUNCEMENT: {
      if (!params.contestId || !params.userId) {
        throw new Error("CONTEST_ANNOUNCEMENT requires contestId and userId");
      }
      return `${kind}:${params.contestId}:${params.userId}`;
    }
    case EmailKind.PLAYER_WITHDRAWAL: {
      if (!params.eventId || !params.userId || !params.playerId) {
        throw new Error("PLAYER_WITHDRAWAL requires eventId, userId, and playerId");
      }
      return `${kind}:${params.eventId}:${params.userId}:${params.playerId}`;
    }
    default: {
      const _exhaustive: never = kind;
      throw new Error(`Unknown email kind: ${_exhaustive}`);
    }
  }
}

export type RenderedEmail = {
  subject: string;
  html: string;
};

export const EMAIL_SEND_STATUS = {
  PENDING: "PENDING",
  SENT: "SENT",
  FAILED: "FAILED",
  SKIPPED: "SKIPPED",
} as const;

export type EmailSendStatus = (typeof EMAIL_SEND_STATUS)[keyof typeof EMAIL_SEND_STATUS];
