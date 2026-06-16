import React, { useMemo } from "react";
import type { CompetitionEventShell } from "@cut/sport-sdk";
import { useSportActiveEvent } from "../../hooks/useSportActiveEvent";
import { useSportUIPlugin } from "../../hooks/useSportUI";
import { LoadingSpinner } from "../common/LoadingSpinner";

type SportEventHeaderVariant = "context" | "standalone";

interface SportEventHeaderProps {
  sportId: string;
  /** `context` = flush hero bar; `standalone` = in-page card with spinner while loading. */
  variant?: SportEventHeaderVariant;
}

export const SportEventHeader: React.FC<SportEventHeaderProps> = ({
  sportId,
  variant = "standalone",
}) => {
  const { event, isLoading, isFetching, error } = useSportActiveEvent(sportId);
  const plugin = useSportUIPlugin(sportId);
  const EventSummary = plugin?.EventSummary;

  const eventShell = useMemo((): CompetitionEventShell | null => {
    if (!event) return null;
    return {
      id: event.id,
      sportId: event.sportId,
      externalId: event.externalId,
      isActive: event.isActive,
      metadata: event.metadata,
    };
  }, [event]);

  if ((isLoading || isFetching) && !eventShell) {
    if (variant === "context") {
      return (
        <div
          aria-hidden
          className="relative min-h-[5.5rem] overflow-hidden bg-gray-200 shadow-sm"
        />
      );
    }

    return (
      <div className="mb-4 flex min-h-[5.5rem] items-center justify-center rounded-lg bg-gray-100">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !eventShell || !EventSummary) {
    return null;
  }

  return <EventSummary event={eventShell} />;
};
