import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentType } from "react";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { lobbyDecorators } from "../../../.storybook/decorators";
import { ContestEventScopeProvider } from "../../contexts/EventScopeContext";
import { buildContestLineup, contestWithLineups } from "../../test/fixtures/contestLobby";
import { FIXTURE_CANDIDATES } from "../../test/fixtures/candidates";
import { queryKeys } from "../../utils/queryKeys";
import { ContestEntryList } from "./ContestEntryList";

function withContestEventScope(Story: ComponentType) {
  const Wrapped = () => {
    const queryClient = useQueryClient();
    const contest = contestWithLineups;
    const sportId = contest.event?.sportId ?? "golf";
    const eventId = contest.eventId;

    useEffect(() => {
      queryClient.setQueryData(
        queryKeys.sports.candidates(sportId, eventId),
        FIXTURE_CANDIDATES,
      );
    }, [queryClient, sportId, eventId]);

    return (
      <ContestEventScopeProvider contest={contest}>
        <Story />
      </ContestEventScopeProvider>
    );
  };

  return <Wrapped />;
}

const meta = {
  title: "Contest/ContestEntryList",
  component: ContestEntryList,
  tags: ["autodocs"],
  decorators: [...lobbyDecorators, withContestEventScope],
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
