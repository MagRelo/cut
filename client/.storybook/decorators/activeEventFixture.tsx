import type { ComponentType } from "react";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Candidate } from "@cut/sport-sdk";
import type { Decorator } from "@storybook/react-vite";
import type { ActiveEventResponse, EventStatus } from "../../src/types/event";
import { queryKeys } from "../../src/utils/queryKeys";

const STORYBOOK_SPORT_ID = "pga-golf";

export type ActiveEventFixtureOptions = {
  sportId?: string;
  status?: EventStatus;
  eventId?: string;
  eventMetadata?: Record<string, unknown>;
  candidates?: Candidate[];
};

function buildActiveEventResponse(options: ActiveEventFixtureOptions): ActiveEventResponse {
  const sportId = options.sportId ?? STORYBOOK_SPORT_ID;
  const eventId = options.eventId ?? "tournament-1";
  const status = options.status ?? "LIVE";

  return {
    sport: {
      id: sportId,
      name: "PGA Golf",
      slug: "golf",
      isEnabled: true,
      rosterRules: { slotCount: 4, minPicks: 1, maxPicks: 4, allowDuplicates: false },
      scoringRules: { aggregation: "sum", direction: "higher_wins" },
      predictionRules: {
        min: 1,
        max: 250,
        defaultRandomMin: 95,
        defaultRandomMax: 145,
      },
    },
    event: {
      id: eventId,
      sportId,
      externalId: "R2026001",
      isActive: true,
      metadata: options.eventMetadata ?? {
        name: "Storybook Open",
        status: "IN_PROGRESS",
        periodDisplay: "R2",
        currentPeriod: 2,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    status,
  };
}

export function withActiveEventFixture(options: ActiveEventFixtureOptions = {}): Decorator {
  const sportId = options.sportId ?? STORYBOOK_SPORT_ID;
  const eventId = options.eventId ?? "tournament-1";
  const status = options.status ?? "LIVE";
  const eventMetadata = options.eventMetadata;
  const candidates = options.candidates;

  return function ActiveEventFixtureDecorator(Story: ComponentType) {
    const Wrapped = () => {
      const queryClient = useQueryClient();

      useEffect(() => {
        const activeEvent = buildActiveEventResponse({
          sportId,
          status,
          eventId,
          eventMetadata,
          candidates,
        });
        queryClient.setQueryData(queryKeys.sports.activeEvent(sportId), activeEvent);
        if (candidates) {
          queryClient.setQueryData(queryKeys.sports.candidates(sportId, eventId), candidates);
        }
      }, [queryClient]);

      return <Story />;
    };

    return <Wrapped />;
  };
}
