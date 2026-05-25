import type { Meta, StoryObj } from "@storybook/react-vite";
import { lobbyDecorators } from "../../.storybook/decorators";
import {
  contestFixtures,
  contestWithLineups,
  contestWithTimeline,
} from "../test/fixtures/contestLobby";
import { ContestLobbyView } from "../components/contest/lobby/ContestLobbyView";
import { deriveContestLobbyViewModel } from "../hooks/deriveContestLobbyViewModel";
import { ContestState } from "../hooks/useContestPredictionData";
import { LoadingSpinner } from "../components/common/LoadingSpinner";

/**
 * Full page stories use `ContestLobbyView` with derived view models (same as the wired page).
 * Swap to `ContestLobby` when Storybook can mock `useContestQuery` without hitting the API.
 */
const meta = {
  title: "Pages/ContestLobby",
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

export const OpenEnterContest: Story = {
  args: {
    contest: contestFixtures.open,
    viewModel: deriveContestLobbyViewModel(contestFixtures.open, {
      contestStateOnChain: ContestState.OPEN,
      hasWallet: true,
    }),
  },
};

export const ActiveTimeline: Story = {
  args: {
    contest: contestWithTimeline,
    viewModel: deriveContestLobbyViewModel(contestWithTimeline, {
      contestStateOnChain: ContestState.ACTIVE,
      hasWallet: true,
    }),
  },
};

export const ActivePredictionsTab: Story = {
  args: {
    contest: contestWithLineups,
    viewModel: deriveContestLobbyViewModel(contestWithLineups, {
      contestStateOnChain: ContestState.ACTIVE,
      hasWallet: true,
    }),
  },
};

export const SettledResultsOnly: Story = {
  args: {
    contest: contestFixtures.settled,
    viewModel: deriveContestLobbyViewModel(contestFixtures.settled, {
      contestStateOnChain: ContestState.SETTLED,
      hasWallet: true,
    }),
  },
};

export const LoadingPlaceholder: Story = {
  args: {
    contest: contestFixtures.open,
    viewModel: deriveContestLobbyViewModel(contestFixtures.open),
  },
  render: () => (
    <div className="space-y-3 p-4">
      <div className="rounded-lg bg-white shadow">
        <div className="flex min-h-[176px] items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    </div>
  ),
};
