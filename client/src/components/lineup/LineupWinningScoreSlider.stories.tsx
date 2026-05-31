import type { Meta, StoryObj } from "@storybook/react-vite";
import { lobbyDecorators } from "../../../.storybook/decorators";
import { LineupWinningScoreSlider } from "./LineupWinningScoreSlider";

const meta = {
  title: "Lineup/WinningScoreSlider",
  component: LineupWinningScoreSlider,
  tags: ["autodocs"],
  decorators: [
    ...lobbyDecorators,
    (Story) => (
      <div className="rounded-sm border border-gray-200 bg-white">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "fullscreen" },
  args: {
    value: 150,
  },
} satisfies Meta<typeof LineupWinningScoreSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default preview at midpoint (150). */
export const Default: Story = {};

export const LowValue: Story = {
  args: { value: 125 },
};

export const HighValue: Story = {
  args: { value: 175 },
};
