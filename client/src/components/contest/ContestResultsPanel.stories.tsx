import type { Meta, StoryObj } from "@storybook/react-vite";
import { lobbyDecorators } from "../../../.storybook/decorators";
import { contestFixtures } from "../../test/fixtures/contestLobby";
import { ContestResultsPanel } from "./ContestResultsPanel";

const meta = {
  title: "Contest/ContestResultsPanel",
  component: ContestResultsPanel,
  tags: ["autodocs"],
  decorators: lobbyDecorators,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ContestResultsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Settled: Story = {
  args: {
    contest: contestFixtures.settled,
  },
};

export const SettledFree: Story = {
  args: {
    contest: contestFixtures.settledFree,
  },
};

export const SettledWithReferralTree: Story = {
  name: "Settled - 3 Level Referral Tree",
  args: {
    contest: contestFixtures.settledWithReferrals,
  },
};

export const SettledWithDeepReferralTree: Story = {
  name: "Settled - 5 Level Referral Tree",
  args: {
    contest: contestFixtures.settledWithDeepReferrals,
  },
};
