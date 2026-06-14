import { useMemo } from "react";
import type { SportUIPlugin } from "@cut/sport-sdk/ui";
import { useSportContext } from "../contexts/SportContext";
import { getSportUIPlugin, requireSportUIPlugin } from "../sports/registry";

export function useSportUIPlugin(): SportUIPlugin | undefined {
  const { sportId } = useSportContext();
  return useMemo(() => getSportUIPlugin(sportId), [sportId]);
}

export function useRequiredSportUIPlugin(): SportUIPlugin {
  const { sportId } = useSportContext();
  return useMemo(() => requireSportUIPlugin(sportId), [sportId]);
}
