import type { Meta, StoryObj } from "@storybook/react-vite";
import { lobbyDecorators } from "../../../../../.storybook/decorators";
import { buildSideBetTicketsFixture } from "../../../../test/fixtures/sideBetMock";
import { mapTicketListItem } from "./resolveSideBetTicketsState";
import { SideBetTicketCard } from "./SideBetTicketCard";

const tickets = buildSideBetTicketsFixture().tickets.map(mapTicketListItem);

const defaultDisplayProps = {
  borderColor: "#3B82F6",
  userLabel: "Storybook User",
  lineupNumberLabel: "Lineup #1",
};

const meta = {
  title: "Lineup/SideBet/TicketCard",
  component: SideBetTicketCard,
  tags: ["autodocs"],
  decorators: lobbyDecorators,
  args: defaultDisplayProps,
} satisfies Meta<typeof SideBetTicketCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: { ticket: tickets.find((t) => t.status === "OPEN")! },
};

export const Won: Story = {
  args: { ticket: tickets.find((t) => t.status === "WON")! },
};

export const Lost: Story = {
  args: { ticket: tickets.find((t) => t.status === "LOST")! },
};

export const Void: Story = {
  args: { ticket: tickets.find((t) => t.status === "VOID")! },
};
