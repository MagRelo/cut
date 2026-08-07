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

export const WithCommentary: Story = {
  args: {
    contest: {
      ...contestWithPredictions,
      commentary:
        "Cutbot likes the chalk stack early, but the long-shot lineup still has a live path if the favorite fades.",
      commentaryGeneratedAt: "2026-07-19T12:00:00.000Z",
    },
  },
};

export const Locked: Story = {
  args: {
    mode: "locked",
    placeWagerTabLocked: true,
  },
};
