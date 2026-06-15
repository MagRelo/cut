import type { ComponentType } from "react";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Candidate } from "@cut/sport-sdk";
import type { Decorator } from "@storybook/react-vite";
import { DEFAULT_SPORT_ID } from "../../src/hooks/useSportData";
import type { ActiveEventResponse, EventStatus } from "../../src/types/event";
import { queryKeys } from "../../src/utils/queryKeys";

export type ActiveEventFixtureOptions = {
  status?: EventStatus;
  eventId?: string;
  eventMetadata?: Record<string, unknown>;
  candidates?: Candidate[];
};

function buildActiveEventResponse(options: ActiveEventFixtureOptions): ActiveEventResponse {
  const eventId = options.eventId ?? "tournament-1";
  const status = options.status ?? "LIVE";

  return {
    sport: {
      id: DEFAULT_SPORT_ID,
      name: "PGA Golf",
      slug: "golf",
      isEnabled: true,
      rosterRules: { slotCount: 4, minPicks: 1, maxPicks: 4, allowDuplicates: false },
      scoringRules: { aggregation: "sum", direction: "higher_wins" },
    },
    event: {
      id: eventId,
      sportId: DEFAULT_SPORT_ID,
      externalId: "R2026001",
      isActive: true,
      metadata: options.eventMetadata ?? {
        name: "Storybook Open",
        status: "IN_PROGRESS",
        roundDisplay: "R2",
        currentRound: 2,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    status,
  };
}

export function withActiveEventFixture(options: ActiveEventFixtureOptions = {}): Decorator {
  const eventId = options.eventId ?? "tournament-1";
  const status = options.status ?? "LIVE";
  const eventMetadata = options.eventMetadata;
  const candidates = options.candidates;

  return function ActiveEventFixtureDecorator(Story: ComponentType) {
    const Wrapped = () => {
      const queryClient = useQueryClient();

      useEffect(() => {
        const activeEvent = buildActiveEventResponse({
          status,
          eventId,
          eventMetadata,
          candidates,
        });
        queryClient.setQueryData(queryKeys.sports.activeEvent(DEFAULT_SPORT_ID), activeEvent);
        if (candidates) {
          queryClient.setQueryData(
            queryKeys.sports.candidates(DEFAULT_SPORT_ID, eventId),
            candidates,
          );
        }
      }, [queryClient]);

      return <Story />;
    };

    return <Wrapped />;
  };
}
