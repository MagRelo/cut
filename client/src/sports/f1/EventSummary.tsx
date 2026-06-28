import React from "react";
import type { EventSummaryProps } from "@cut/sport-sdk/ui";
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
    <div className="relative overflow-hidden shadow-sm">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${headerImageUrl})` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-black/50" aria-hidden />
      <div className="relative z-10 px-4 py-3">
        <F1EventDetails event={event} />
      </div>
    </div>
  );
};
