import { useMemo } from "react";
import type { SportUIPlugin } from "@cut/sport-sdk/ui";
import { useOptionalEventScope } from "../contexts/EventScopeContext";
import { getSportUIPlugin, requireSportUIPlugin } from "../sports/registry";

export function useSportUIPlugin(sportId?: string): SportUIPlugin | undefined {
  const scope = useOptionalEventScope();
  const resolvedSportId = sportId ?? scope?.sportId;
  return useMemo(
    () => (resolvedSportId ? getSportUIPlugin(resolvedSportId) : undefined),
    [resolvedSportId],
  );
}

export function useRequiredSportUIPlugin(sportId?: string): SportUIPlugin {
  const scope = useOptionalEventScope();
  const resolvedSportId = sportId ?? scope?.sportId;
  if (!resolvedSportId) {
    throw new Error(
      "sportId is required: pass explicitly or render within an EventScope provider",
    );
  }
  return useMemo(() => requireSportUIPlugin(resolvedSportId), [resolvedSportId]);
}
