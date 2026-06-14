import React from "react";
import { useSportEventHeader } from "../../hooks/useSportEventHeader";
import { LoadingSpinner } from "../common/LoadingSpinner";

type SportEventHeaderVariant = "context" | "standalone";

interface SportEventHeaderProps {
  /** `context` = AppLayout hero bar; `standalone` = in-page card with spinner while loading. */
  variant?: SportEventHeaderVariant;
}

export const SportEventHeader: React.FC<SportEventHeaderProps> = ({
  variant = "standalone",
}) => {
  const { event, isLoading, isFetching, error, EventSummary } = useSportEventHeader();

  if ((isLoading || isFetching) && !event) {
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

  if (error || !event || !EventSummary) {
    return null;
  }

  return <EventSummary event={event} />;
};
