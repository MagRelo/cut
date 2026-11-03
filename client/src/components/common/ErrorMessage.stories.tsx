import type { Meta, StoryObj } from "@storybook/react-vite";
import { ErrorMessage } from "./ErrorMessage";

const meta = {
  title: "Common/ErrorMessage",
  component: ErrorMessage,
  tags: ["autodocs"],
  args: {
    message: "League name is required",
  },
} satisfies Meta<typeof ErrorMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Multiline: Story = {
  args: {
    message: "Could not sign in.\nCheck your connection and try again.",
  },
};

export const Compact: Story = {
  args: {
    message: "Score must be between 0 and 20",
    className: "text-xs",
  },
};
