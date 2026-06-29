import React from "react";
import type { EventSummaryProps } from "@cut/sport-sdk/ui";
import { CommodityEventDetails } from "./EventDetails";

const HERO_GRADIENT =
  "linear-gradient(135deg, #78350f 0%, #b45309 35%, #15803d 70%, #1e293b 100%)";

export function resolveCommodityEventHeroImage(_event: EventSummaryProps["event"]): string {
  return "";
}

export const CommodityEventSummary: React.FC<EventSummaryProps> = ({
  event,
  surface = "hero",
}) => {
  if (surface === "content") {
    return (
      <div className="px-4 py-3">
        <CommodityEventDetails event={event} className="text-gray-900 [&_h1_a]:text-gray-900 [&_span]:text-gray-600" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden shadow-sm">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: HERO_GRADIENT }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-black/35" aria-hidden />
      <div className="relative z-10 px-4 py-3">
        <CommodityEventDetails event={event} />
        <p className="mt-2 text-xs text-white/75">
          Pick five contracts from today&apos;s pit — highest combined % move wins.
        </p>
      </div>
    </div>
  );
};
