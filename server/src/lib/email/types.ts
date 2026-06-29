/** Matches idempotency keys in docs/operations/email-program.md */
export enum EmailKind {
  WELCOME = "WELCOME",
  NEW_TOURNAMENT = "NEW_TOURNAMENT",
  REMINDER_NO_CONTEST = "REMINDER_NO_CONTEST",
  TOURNAMENT_RECAP = "TOURNAMENT_RECAP",
  BEHIND_THE_SCENES = "BEHIND_THE_SCENES",
  PLAYER_WITHDRAWAL = "PLAYER_WITHDRAWAL",
}

export type EmailDedupeParams = {
  userId?: string;
  eventId?: string;
  campaignId?: string;
  playerId?: string;
};

function resolveEventId(params: EmailDedupeParams): string {
  const eventId = params.eventId;
  if (!eventId) {
    throw new Error("eventId is required");
  }
  return eventId;
}

export function buildDedupeKey(kind: EmailKind, params: EmailDedupeParams): string {
  switch (kind) {
    case EmailKind.WELCOME:
      if (!params.userId) throw new Error("WELCOME requires userId");
      return `${kind}:${params.userId}`;
    case EmailKind.NEW_TOURNAMENT:
    case EmailKind.TOURNAMENT_RECAP: {
      const eventId = resolveEventId(params);
      if (params.userId) return `${kind}:${eventId}:${params.userId}`;
      return `${kind}:${eventId}`;
    }
    case EmailKind.REMINDER_NO_CONTEST: {
      const eventId = resolveEventId(params);
      if (!params.userId) {
        throw new Error("REMINDER_NO_CONTEST requires eventId and userId");
      }
      return `${kind}:${eventId}:${params.userId}`;
    }
    case EmailKind.BEHIND_THE_SCENES:
      if (!params.campaignId) throw new Error("BEHIND_THE_SCENES requires campaignId");
      return `${kind}:${params.campaignId}`;
    case EmailKind.PLAYER_WITHDRAWAL: {
      const eventId = resolveEventId(params);
      if (!params.userId || !params.playerId) {
        throw new Error("PLAYER_WITHDRAWAL requires eventId, userId, and playerId");
      }
      return `${kind}:${eventId}:${params.userId}:${params.playerId}`;
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
