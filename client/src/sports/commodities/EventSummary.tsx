import React, { useState } from "react";
import { parseCommoditiesEventMetadata } from "@cut/sport-commodities";
import type { EventSummaryProps } from "@cut/sport-sdk/ui";
import { EventHeroPanel } from "../../components/platform/EventHeroPanel";
import { CommodityEventDetails } from "./EventDetails";
import { CommodityWeekBriefModal } from "./WeekBriefModal";

export const COMMODITY_EVENT_HERO_IMAGE = "/CommodityBG3.png";

export function resolveCommodityEventHeroImage(_event: EventSummaryProps["event"]): string {
  return COMMODITY_EVENT_HERO_IMAGE;
}

function eventDisplayName(event: EventSummaryProps["event"]): string {
  const metadata = event.metadata;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const name = (metadata as { name?: unknown }).name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return event.externalId;
}

function summarySectionsFromEvent(event: EventSummaryProps["event"]): unknown {
  const metadata = event.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  return (metadata as { summarySections?: unknown }).summarySections;
}

export const CommodityEventSummary: React.FC<EventSummaryProps> = ({ event, surface = "hero" }) => {
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const summarySections = summarySectionsFromEvent(event);
  const hasSummary = Boolean(summarySections);
  const commodities = parseCommoditiesEventMetadata(event.metadata);

  const headerImageUrl = resolveCommodityEventHeroImage(event);

  const details = (
    <CommodityEventDetails
      event={event}
      tone={surface === "content" ? "paper" : "hero"}
      hasSummary={hasSummary}
      onOpenSummary={hasSummary ? () => setIsSummaryOpen(true) : undefined}
    />
  );

  const summaryModal = hasSummary ? (
    <CommodityWeekBriefModal
      isOpen={isSummaryOpen}
      onClose={() => setIsSummaryOpen(false)}
      eventName={eventDisplayName(event)}
      sessionOpen={commodities?.sessionOpen}
      sessionClose={commodities?.sessionClose}
      summarySections={summarySections}
    />
  ) : null;

  if (surface === "content" || !headerImageUrl) {
    return (
      <div className="px-4 py-3">
        {details}
        {summaryModal}
      </div>
    );
  }

  return (
    <>
      <EventHeroPanel sportId={event.sportId} imageUrl={headerImageUrl}>
        {details}
      </EventHeroPanel>
      {summaryModal}
    </>
  );
};
