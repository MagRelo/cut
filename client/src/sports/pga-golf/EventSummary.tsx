import React, { useState } from "react";
import type { EventSummaryProps } from "@cut/sport-sdk/ui";
import { parseGolfEventMetadata } from "@cut/sport-pga-golf";
import { EventHeroPanel } from "../../components/platform/EventHeroPanel";
import { DEFAULT_TOURNAMENT_BEAUTY_IMAGE, resolveTournamentBeautyImage } from "./eventMedia";
import { parseGolfEventMetadata as parseLocalGolfEventMetadata } from "./utils";
import { GolfEventDetails } from "./EventDetails";
import { TournamentSummaryModal } from "./TournamentSummaryModal";

export function resolveGolfEventHeroImage(event: EventSummaryProps["event"]): string {
  const meta = parseLocalGolfEventMetadata(event.metadata);
  return resolveTournamentBeautyImage(meta.beautyImage ?? DEFAULT_TOURNAMENT_BEAUTY_IMAGE);
}

export const GolfEventSummary: React.FC<EventSummaryProps> = ({ event, surface = "hero" }) => {
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const meta = parseGolfEventMetadata(event.metadata);
  const hasSummary = Boolean(meta?.summarySections);

  const details = (
    <GolfEventDetails
      event={event}
      hasSummary={hasSummary}
      onOpenSummary={() => setIsSummaryOpen(true)}
    />
  );

  const summaryModal = (
    <TournamentSummaryModal
      isOpen={isSummaryOpen}
      onClose={() => setIsSummaryOpen(false)}
      tournamentName={meta?.name ?? event.externalId}
      course={meta?.course}
      city={meta?.city}
      state={meta?.state}
      startDate={meta?.startDate}
      endDate={meta?.endDate}
      summarySections={meta?.summarySections}
    />
  );

  if (surface === "content") {
    return (
      <div className="px-4 py-3">
        {details}
        {summaryModal}
      </div>
    );
  }

  const headerImageUrl = resolveGolfEventHeroImage(event);

  return (
    <>
      <EventHeroPanel sportId={event.sportId} imageUrl={headerImageUrl} contentClassName="p-4">
        {details}
      </EventHeroPanel>
      {summaryModal}
    </>
  );
};
