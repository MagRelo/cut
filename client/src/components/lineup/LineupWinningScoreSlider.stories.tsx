import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
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
  render: (args) => {
    const [value, setValue] = useState(args.value ?? 150);
    return <LineupWinningScoreSlider {...args} value={value} onChange={setValue} />;
  },
  args: {
    value: 150,
    onChange: () => {},
  },
} satisfies Meta<typeof LineupWinningScoreSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LowValue: Story = {
  args: { value: 125 },
};

export const HighValue: Story = {
  args: { value: 175 },
};

export const WithError: Story = {
  args: {
    value: 142,
    error: "You already have a lineup with these players and winning score prediction for this tournament",
  },
};

export const Disabled: Story = {
  args: { value: 150, disabled: true },
};
