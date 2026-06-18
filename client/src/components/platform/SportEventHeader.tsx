import React, { useMemo } from "react";
import type { CompetitionEventShell } from "@cut/sport-sdk";
import { useSportActiveEvent } from "../../hooks/useSportActiveEvent";
import { useSportUIPlugin } from "../../hooks/useSportUI";
import { LoadingSpinner } from "../common/LoadingSpinner";

type SportEventHeaderVariant = "context" | "standalone";

interface SportEventHeaderProps {
  sportId: string;
  /** When set, renders this event instead of fetching the sport's active event. */
  event?: CompetitionEventShell | null;
  /** `context` = flush hero bar; `standalone` = in-page card with spinner while loading. */
  variant?: SportEventHeaderVariant;
}

function EventSummaryHeader({
  sportId,
  event,
}: {
  sportId: string;
  event: CompetitionEventShell;
}) {
  const plugin = useSportUIPlugin(sportId);
  const EventSummary = plugin?.EventSummary;
  if (!EventSummary) return null;
  return <EventSummary event={event} />;
}

function SportActiveEventHeader({
  sportId,
  variant,
}: {
  sportId: string;
  variant: SportEventHeaderVariant;
}) {
  const { event, isLoading, isFetching, error } = useSportActiveEvent(sportId);

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

  if (error || !eventShell) {
    return null;
  }

  return <EventSummaryHeader sportId={sportId} event={eventShell} />;
}

export const SportEventHeader: React.FC<SportEventHeaderProps> = ({
  sportId,
  event: eventOverride,
  variant = "standalone",
}) => {
  if (eventOverride) {
    return <EventSummaryHeader sportId={sportId} event={eventOverride} />;
  }

  return <SportActiveEventHeader sportId={sportId} variant={variant} />;
};
