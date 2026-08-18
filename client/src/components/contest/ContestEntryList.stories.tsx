import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ComponentType } from "react";
import { lobbyDecorators } from "../../../.storybook/decorators";
import { ContestEventScopeProvider } from "../../contexts/EventScopeContext";
import { buildContestLineup, contestWithLineups } from "../../test/fixtures/contestLobby";
import { ContestEntryList } from "./ContestEntryList";

function withContestEventScope(Story: ComponentType) {
  const Wrapped = () => (
    <ContestEventScopeProvider contest={contestWithLineups}>
      <Story />
    </ContestEventScopeProvider>
  );

  return Wrapped;
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
