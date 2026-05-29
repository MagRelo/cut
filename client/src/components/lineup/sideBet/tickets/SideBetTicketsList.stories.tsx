import type { Meta, StoryObj } from "@storybook/react-vite";
import { lobbyDecorators } from "../../../../../.storybook/decorators";
import { buildSideBetTicketsFixture } from "../../../../test/fixtures/sideBetMock";
import { SIDE_BET_TICKETS_LOAD_ERROR } from "../shared/sideBetConstants";
import { mapTicketListItem, sortTicketsNewestFirst } from "./resolveSideBetTicketsState";
import { SideBetTicketsList } from "./SideBetTicketsList";

const defaultDisplayProps = {
  borderColor: "#3B82F6",
  userLabel: "Storybook User",
  lineupNumberLabel: "Lineup #1",
};

const meta = {
  title: "Lineup/SideBet/TicketsList",
  component: SideBetTicketsList,
  tags: ["autodocs"],
  decorators: lobbyDecorators,
  args: defaultDisplayProps,
} satisfies Meta<typeof SideBetTicketsList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: { state: { kind: "loading" } },
};

export const Error: Story = {
  args: {
    state: { kind: "error", message: SIDE_BET_TICKETS_LOAD_ERROR },
  },
};

export const Empty: Story = {
  args: { state: { kind: "empty" } },
};

export const WithTickets: Story = {
  args: {
    state: {
      kind: "ready",
      tickets: sortTicketsNewestFirst(
        buildSideBetTicketsFixture().tickets.map(mapTicketListItem),
      ),
    },
  },
};
