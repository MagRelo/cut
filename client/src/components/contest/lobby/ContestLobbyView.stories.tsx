import type { Meta, StoryObj } from "@storybook/react-vite";
import { lobbyDecorators } from "../../../../.storybook/decorators";
import {
  contestFixtures,
  contestLobbyViewModels,
  contestTimelineFixture,
  contestWithLineups,
  contestWithTimeline,
} from "../../../test/fixtures/contestLobby";
import { ContestLobbyView } from "./ContestLobbyView";

const meta = {
  title: "Contest/Lobby/ContestLobbyView",
  component: ContestLobbyView,
  tags: ["autodocs"],
  decorators: lobbyDecorators,
  parameters: { layout: "fullscreen" },
  args: {
    currentUserId: "user-1",
    isAuthenticated: true,
  },
} satisfies Meta<typeof ContestLobbyView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OpenPreRound: Story = {
  args: {
    contest: contestFixtures.open,
    viewModel: contestLobbyViewModels.openPreRound,
  },
};

export const ActiveLive: Story = {
  args: {
    contest: contestWithTimeline,
    viewModel: contestLobbyViewModels.activeLive,
    timelineData: contestTimelineFixture,
  },
};

export const ActiveWithPredictions: Story = {
  args: {
    contest: contestWithLineups,
    viewModel: contestLobbyViewModels.activeLive,
  },
};

export const Locked: Story = {
  args: {
    contest: contestFixtures.locked,
    viewModel: contestLobbyViewModels.locked,
  },
};

export const Settled: Story = {
  args: {
    contest: contestFixtures.settled,
    viewModel: contestLobbyViewModels.settled,
  },
};

export const PredictionsConnectWallet: Story = {
  args: {
    contest: contestWithLineups,
    viewModel: contestLobbyViewModels.activeNoWallet,
    isAuthenticated: false,
  },
};
