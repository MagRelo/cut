import type { Meta, StoryObj } from "@storybook/react-vite";
import { lobbyDecorators } from "../../../../.storybook/decorators";
import { STORYBOOK_SIDE_BET_LINEUP_ID } from "../../../test/fixtures/sideBetMock";
import { SideBetPanel } from "./SideBetPanel";

const defaultPanelArgs = {
  borderColor: "#3B82F6",
  userLabel: "Storybook User",
  lineupNumberLabel: "Lineup #1",
  playerLastNamesLine: "Scheffler, McIlroy, Rahm, Schauffele",
  tournamentLineupId: STORYBOOK_SIDE_BET_LINEUP_ID,
};

const meta = {
  title: "Lineup/SideBet/Panel",
  component: SideBetPanel,
  tags: ["autodocs"],
  decorators: lobbyDecorators,
  parameters: { layout: "fullscreen" },
  args: defaultPanelArgs,
} satisfies Meta<typeof SideBetPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Integration story — requires live API or MSW. Prefer MarketGrid/TicketsList stories for UI states. */
export const Default: Story = {};

export const NoLineup: Story = {
  args: {
    tournamentLineupId: null,
  },
};
