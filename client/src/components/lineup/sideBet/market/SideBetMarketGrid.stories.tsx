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
    state: { kind: "error", message: PARLAY_MARKET_UNAVAILABLE, selections: [] },
  },
};

export const Unavailable: Story = {
  args: {
    state: {
      kind: "unavailable",
      message: PARLAY_MARKET_CLOSED,
      selections: [],
    },
  },
};

export const UnavailableWithOdds: Story = {
  args: {
    state: {
      kind: "unavailable",
      message: PARLAY_MARKET_CLOSED,
      selections: buildSideBetSelectionsFixture(),
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

/** Wide odds spread — exercises the full conditional palette (favorite → moonshot). */
export const ReadyWideOddsSpread: Story = {
  args: {
    state: {
      kind: "ready",
      selections: [
        { id: "s1", hitsRequired: 2, topN: 5, decimalOdds: 5.29, americanDisplay: "+429", rowLabel: "2 of 4", colLabel: "Top 5" },
        { id: "s2", hitsRequired: 3, topN: 5, decimalOdds: 37.2, americanDisplay: "+3620", rowLabel: "3 of 4", colLabel: "Top 5" },
        { id: "s3", hitsRequired: 4, topN: 5, decimalOdds: 201, americanDisplay: "+20000", rowLabel: "4 of 4", colLabel: "Top 5" },
        { id: "s4", hitsRequired: 2, topN: 10, decimalOdds: 2.17, americanDisplay: "+117", rowLabel: "2 of 4", colLabel: "Top 10" },
        { id: "s5", hitsRequired: 3, topN: 10, decimalOdds: 7.92, americanDisplay: "+692", rowLabel: "3 of 4", colLabel: "Top 10" },
        { id: "s6", hitsRequired: 4, topN: 10, decimalOdds: 72.5, americanDisplay: "+7150", rowLabel: "4 of 4", colLabel: "Top 10" },
        { id: "s7", hitsRequired: 2, topN: 20, decimalOdds: 1.148, americanDisplay: "-675", rowLabel: "2 of 4", colLabel: "Top 20" },
        { id: "s8", hitsRequired: 3, topN: 20, decimalOdds: 2.12, americanDisplay: "+112", rowLabel: "3 of 4", colLabel: "Top 20" },
        { id: "s9", hitsRequired: 4, topN: 20, decimalOdds: 8.57, americanDisplay: "+757", rowLabel: "4 of 4", colLabel: "Top 20" },
      ],
    },
  },
};
