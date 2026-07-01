import React from "react";
import type { EventSummaryProps } from "@cut/sport-sdk/ui";
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
    <div className="relative overflow-hidden shadow-sm">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${headerImageUrl})` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-black/50" aria-hidden />
      <div className="relative z-10 px-4 py-3">
        <CommodityEventDetails event={event} />
      </div>
    </div>
  );
};
