import React, { createContext, useContext, useMemo } from "react";
import type { Candidate } from "@cut/sport-sdk";
import type { CompetitionEventShell } from "@cut/sport-sdk";
import type { Contest } from "../types/contest";
import type { EventStatus } from "../types/event";
import { useContestEvent } from "../hooks/useContestEvent";

export type EventScopeValue = {
  kind: "contest";
  sportId: string;
  eventId: string;
  metadata: unknown;
  status: EventStatus;
  eventShell: CompetitionEventShell | null;
  candidates: Candidate[];
  isLoading: boolean;
  error: Error | null;
};

const EventScopeContext = createContext<EventScopeValue | null>(null);

function scopeFromContest(state: ReturnType<typeof useContestEvent>): EventScopeValue | null {
  if (!state.sportId || !state.eventShell) return null;
  return {
    kind: "contest",
    sportId: state.sportId,
    eventId: state.eventId,
    metadata: state.metadata,
    status: state.status,
    eventShell: state.eventShell,
    candidates: state.candidates ?? [],
    isLoading: state.isLoading,
    error: state.error,
  };
}

export function ContestEventScopeProvider({
  contest,
  children,
}: {
  contest: Contest;
  children: React.ReactNode;
}) {
  const state = useContestEvent(contest);
  const value = useMemo(() => scopeFromContest(state), [state]);

  return <EventScopeContext.Provider value={value}>{children}</EventScopeContext.Provider>;
}

export function useEventScope(): EventScopeValue {
  const scope = useContext(EventScopeContext);
  if (!scope) {
    throw new Error("useEventScope must be used within ContestEventScopeProvider");
  }
  return scope;
}

export function useOptionalEventScope(): EventScopeValue | null {
  return useContext(EventScopeContext);
}
