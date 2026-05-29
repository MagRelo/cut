import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { lobbyDecorators } from "../../../../../.storybook/decorators";
import {
  buildBettableSideBetMarket,
  buildSideBetSelectionsFixture,
} from "../../../../test/fixtures/sideBetMock";
import { PARLAY_MARKET_CLOSED, PARLAY_MARKET_UNAVAILABLE } from "../shared/sideBetConstants";
import { SideBetMarketGrid } from "./SideBetMarketGrid";

const meta = {
  title: "Lineup/SideBet/MarketGrid",
  component: SideBetMarketGrid,
  tags: ["autodocs"],
  decorators: lobbyDecorators,
  args: {
    onSelect: fn(),
  },
} satisfies Meta<typeof SideBetMarketGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: { state: { kind: "loading" } },
};

export const Error: Story = {
  args: {
    state: { kind: "error", message: PARLAY_MARKET_UNAVAILABLE },
  },
};

export const Unavailable: Story = {
  args: {
    state: {
      kind: "unavailable",
      message: PARLAY_MARKET_CLOSED,
    },
  },
};

export const Ready: Story = {
  args: {
    state: {
      kind: "ready",
      selections: buildSideBetSelectionsFixture(),
    },
  },
};

export const ReadyFromMarketFixture: Story = {
  args: {
    state: {
      kind: "ready",
      selections: buildBettableSideBetMarket().selections,
    },
  },
};
