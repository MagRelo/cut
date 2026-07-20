import type { Meta, StoryObj } from "@storybook/react-vite";
import { lobbyDecorators } from "../../../../.storybook/decorators";
import { contestWithPredictions } from "../../../test/fixtures/contestLobby";
import { WinnerPoolOverview } from "./WinnerPoolOverview";

const meta = {
  title: "Contest/Lobby/WinnerPoolOverview",
  component: WinnerPoolOverview,
  tags: ["autodocs"],
  decorators: lobbyDecorators,
  args: {
    contest: contestWithPredictions,
    mode: "wager",
    placeWagerTabLocked: false,
  },
} satisfies Meta<typeof WinnerPoolOverview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutCommentary: Story = {};

export const Locked: Story = {
  args: {
    mode: "locked",
    placeWagerTabLocked: true,
  },
};

export const WithCommentary: Story = {
  args: {
    contest: {
      ...contestWithPredictions,
      commentary:
        "Player One owns the lead, but Player Two has the sharper route home. One strong closing stretch from the low-owned core flips the entire winner pool, while the chalk-heavy lineups need the current leaderboard to freeze. The simulations still favor the leader, though the gap is narrow enough that every remaining hole matters.",
      commentaryGeneratedAt: "2026-07-19T04:00:00.000Z",
    },
  },
};
