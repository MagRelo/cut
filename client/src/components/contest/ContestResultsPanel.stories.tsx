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
