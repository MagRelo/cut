import React from "react";
import type { CompetitionEventShell } from "@cut/sport-sdk";
import type { EventSummarySurface } from "@cut/sport-sdk/ui";
import { useSportUIPlugin } from "../../hooks/useSportUI";

interface SportEventHeaderProps {
  sportId: string;
  event: CompetitionEventShell;
  /** Passed through to the sport `EventSummary` when rendering event details. */
  summarySurface?: EventSummarySurface;
}

export const SportEventHeader: React.FC<SportEventHeaderProps> = ({
  sportId,
  event,
  summarySurface,
}) => {
  const plugin = useSportUIPlugin(sportId);
  const EventSummary = plugin?.EventSummary;
  if (!EventSummary) return null;
  return <EventSummary event={event} surface={summarySurface} />;
};
