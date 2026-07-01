import React from "react";
import type { EventSummaryProps } from "@cut/sport-sdk/ui";
import { EventHeroPanel } from "../../components/platform/EventHeroPanel";
import { CommodityEventDetails } from "./EventDetails";

export const COMMODITY_EVENT_HERO_IMAGE = "/CommodityBG3.png";

export function resolveCommodityEventHeroImage(_event: EventSummaryProps["event"]): string {
  return COMMODITY_EVENT_HERO_IMAGE;
}

export const CommodityEventSummary: React.FC<EventSummaryProps> = ({ event, surface = "hero" }) => {
  const headerImageUrl = resolveCommodityEventHeroImage(event);

  if (surface === "content" || !headerImageUrl) {
    return (
      <div className="px-4 py-3">
        <CommodityEventDetails event={event} />
      </div>
    );
  }

  return (
    <EventHeroPanel sportId={event.sportId} imageUrl={headerImageUrl}>
      <CommodityEventDetails event={event} />
    </EventHeroPanel>
  );
};
