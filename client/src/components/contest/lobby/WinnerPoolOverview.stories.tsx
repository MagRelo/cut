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
