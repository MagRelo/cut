import React from "react";
import type { EventSummaryProps } from "@cut/sport-sdk/ui";
import { EventHeroPanel } from "../../components/platform/EventHeroPanel";
import { parseF1EventMetadata } from "@cut/sport-f1";
import { resolveF1CircuitHeroImage } from "./eventMedia";
import { F1EventDetails } from "./EventDetails";

export function resolveF1EventHeroImage(event: EventSummaryProps["event"]): string {
  const f1 = parseF1EventMetadata(event.metadata);
  return resolveF1CircuitHeroImage(f1?.circuitId);
}

export const F1EventSummary: React.FC<EventSummaryProps> = ({ event, surface = "hero" }) => {
  if (surface === "content") {
    return (
      <div className="px-4 py-3">
        <F1EventDetails event={event} />
      </div>
    );
  }

  const headerImageUrl = resolveF1EventHeroImage(event);

  return (
    <EventHeroPanel sportId={event.sportId} imageUrl={headerImageUrl}>
      <F1EventDetails event={event} />
    </EventHeroPanel>
  );
};
