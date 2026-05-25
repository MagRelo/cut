import type { Meta, StoryObj } from "@storybook/react-vite";
import { lobbyDecorators } from "../../../../.storybook/decorators";
import { contestWithPredictions } from "../../../test/fixtures/contestLobby";
import { ContestPredictionsPanel } from "./ContestPredictionsPanel";

const meta = {
  title: "Contest/Lobby/ContestPredictionsPanel",
  component: ContestPredictionsPanel,
  tags: ["autodocs"],
  decorators: lobbyDecorators,
  parameters: { layout: "fullscreen" },
  args: {
    contest: contestWithPredictions,
    mode: "wager",
    placeWagerTabLocked: false,
  },
} satisfies Meta<typeof ContestPredictionsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Wager: Story = {
  args: {
    mode: "wager",
    placeWagerTabLocked: false,
  },
};

export const WagerLocked: Story = {
  args: {
    mode: "wager",
    placeWagerTabLocked: true,
  },
};

export const PositionsOnly: Story = {
  args: {
    mode: "positions",
    placeWagerTabLocked: true,
  },
};

export const Locked: Story = {
  args: {
    mode: "locked",
    placeWagerTabLocked: true,
  },
};

export const ConnectWallet: Story = {
  args: {
    mode: "connectWallet",
    placeWagerTabLocked: true,
  },
};
