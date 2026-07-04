import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { lobbyDecorators } from "../../../../.storybook/decorators";
import { resetStorybookSideBetMocks } from "../../../../.storybook/mocks/useSideBetQueries";
import { STORYBOOK_SIDE_BET_LINEUP_ID } from "../../../test/fixtures/sideBetMock";
import { SideBetPanel } from "./SideBetPanel";

const defaultPanelArgs = {
  borderColor: "#3B82F6",
  userLabel: "Storybook User",
  lineupNumberLabel: "Lineup #1",
  playerLastNamesLine: "Scheffler, McIlroy, Rahm, Schauffele",
  lineupId: STORYBOOK_SIDE_BET_LINEUP_ID,
};

const withSideBetMocks =
  (
    options?: Parameters<typeof resetStorybookSideBetMocks>[0],
  ): Decorator =>
  (Story) => {
    resetStorybookSideBetMocks(options);
    return <Story />;
  };

const meta = {
  title: "Lineup/SideBet/Panel",
  component: SideBetPanel,
  tags: ["autodocs"],
  decorators: [withSideBetMocks(), ...lobbyDecorators],
  parameters: { layout: "fullscreen" },
  args: defaultPanelArgs,
} satisfies Meta<typeof SideBetPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoLineup: Story = {
  args: {
    lineupId: null,
  },
};

export const MarketLoading: Story = {
  decorators: [withSideBetMocks({ market: "loading" })],
};

export const MarketClosed: Story = {
  decorators: [withSideBetMocks({ market: "closed" })],
};

export const MarketUnavailable: Story = {
  decorators: [withSideBetMocks({ market: "unavailable" })],
};

export const MarketError: Story = {
  decorators: [withSideBetMocks({ market: "error" })],
};

export const EmptyTickets: Story = {
  decorators: [withSideBetMocks({ tickets: "empty" })],
};

export const TicketsLoading: Story = {
  decorators: [withSideBetMocks({ tickets: "loading" })],
};

export const TicketsError: Story = {
  decorators: [withSideBetMocks({ tickets: "error" })],
};
