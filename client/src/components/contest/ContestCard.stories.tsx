import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { lobbyDecorators } from "../../../.storybook/decorators";
import { contestFixtures } from "../../test/fixtures/contestLobby";
import { ContestCard } from "./ContestCard";

const meta = {
  title: "Contest/ContestCard",
  component: ContestCard,
  tags: ["autodocs"],
  decorators: lobbyDecorators,
  parameters: { layout: "fullscreen" },
  args: {
    onPotClick: fn(),
  },
} satisfies Meta<typeof ContestCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    contest: contestFixtures.open,
  },
};

export const Active: Story = {
  args: {
    contest: contestFixtures.active,
  },
};

export const Settled: Story = {
  args: {
    contest: contestFixtures.settled,
  },
};
