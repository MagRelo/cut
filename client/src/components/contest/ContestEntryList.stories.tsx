import type { Meta, StoryObj } from "@storybook/react-vite";
import { lobbyDecorators } from "../../../.storybook/decorators";
import {
  buildContestLineup,
  contestWithLineups,
} from "../../test/fixtures/contestLobby";
import { ContestEntryList } from "./ContestEntryList";

const meta = {
  title: "Contest/ContestEntryList",
  component: ContestEntryList,
  tags: ["autodocs"],
  decorators: lobbyDecorators,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ContestEntryList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PreContestOpen: Story = {
  args: {
    contestLineups: contestWithLineups.contestLineups,
    roundDisplay: "R1",
    contestStatus: "OPEN",
    entryListOpensModal: false,
  },
};

export const LiveLocked: Story = {
  args: {
    contestLineups: contestWithLineups.contestLineups,
    roundDisplay: "R2",
    contestStatus: "ACTIVE",
    entryListOpensModal: true,
  },
};

export const Empty: Story = {
  args: {
    contestLineups: [],
    roundDisplay: "R1",
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
    roundDisplay: "R3",
    contestStatus: "LOCKED",
    entryListOpensModal: true,
  },
};
