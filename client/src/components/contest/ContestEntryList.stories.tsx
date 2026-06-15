import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentType } from "react";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { lobbyDecorators } from "../../../.storybook/decorators";
import { buildContestLineup, contestWithLineups } from "../../test/fixtures/contestLobby";
import { FIXTURE_CANDIDATES } from "../../test/fixtures/candidates";
import { DEFAULT_SPORT_ID } from "../../hooks/useSportData";
import { queryKeys } from "../../utils/queryKeys";
import type { ActiveEventResponse } from "../../types/event";
import { ContestEntryList } from "./ContestEntryList";

function withFixtureCandidates(Story: ComponentType) {
  const Wrapped = () => {
    const queryClient = useQueryClient();

    useEffect(() => {
      const activeEvent: ActiveEventResponse = {
        sport: {
          id: DEFAULT_SPORT_ID,
          name: "PGA Golf",
          slug: "golf",
          isEnabled: true,
          rosterRules: { slotCount: 4, minPicks: 1, maxPicks: 4, allowDuplicates: false },
          scoringRules: { aggregation: "sum", direction: "higher_wins" },
        },
        event: {
          id: "tournament-1",
          sportId: DEFAULT_SPORT_ID,
          externalId: "R2026001",
          isActive: true,
          metadata: { status: "IN_PROGRESS", roundDisplay: "R2" },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        status: "LIVE",
      };

      queryClient.setQueryData(queryKeys.sports.activeEvent(DEFAULT_SPORT_ID), activeEvent);
      queryClient.setQueryData(
        queryKeys.sports.candidates(DEFAULT_SPORT_ID, "tournament-1"),
        FIXTURE_CANDIDATES,
      );
    }, [queryClient]);

    return <Story />;
  };

  return <Wrapped />;
}

const meta = {
  title: "Contest/ContestEntryList",
  component: ContestEntryList,
  tags: ["autodocs"],
  decorators: [...lobbyDecorators, withFixtureCandidates],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ContestEntryList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PreContestOpen: Story = {
  args: {
    contestLineups: contestWithLineups.contestLineups,
    contestStatus: "OPEN",
    entryListOpensModal: false,
  },
};

export const LiveLocked: Story = {
  args: {
    contestLineups: contestWithLineups.contestLineups,
    contestStatus: "ACTIVE",
    entryListOpensModal: true,
  },
};

export const Empty: Story = {
  args: {
    contestLineups: [],
    contestStatus: "ACTIVE",
    entryListOpensModal: true,
  },
};

export const ManyEntries: Story = {
  args: {
    contestLineups: Array.from({ length: 8 }, (_, i) =>
      buildContestLineup({
        id: `lineup-${i + 1}`,
        position: i + 1,
        score: 20 - i,
        user: {
          id: `user-${i + 1}`,
          name: `Player ${i + 1}`,
          userType: "USER",
          isVerified: true,
          loginAttempts: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
    ),
    contestStatus: "LOCKED",
    entryListOpensModal: true,
  },
};
