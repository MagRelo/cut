import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";

const meta = {
  title: "Common/Button",
  component: Button,
  tags: ["autodocs"],
  args: {
    children: "Join",
    variant: "primary",
    size: "md",
    block: false,
    pressed: false,
    disabled: false,
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Neutral: Story = {
  args: {
    variant: "neutral",
    children: "View",
  },
};

export const Compact: Story = {
  args: {
    size: "compact",
    children: "Edit",
  },
};

export const Block: Story = {
  args: {
    block: true,
    children: "Enter Contest",
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: "Save",
  },
};
