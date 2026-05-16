import type { Meta, StoryObj } from "@storybook/react-vite";
import { LoadingSpinner } from "./LoadingSpinner";

const meta = {
  title: "Common/Loading spinner",
  component: LoadingSpinner,
  tags: ["autodocs"],
} satisfies Meta<typeof LoadingSpinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = {
  args: { size: "small" },
};

export const Medium: Story = {
  args: { size: "medium" },
};

export const Large: Story = {
  args: { size: "large" },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-8">
      <LoadingSpinner size="small" />
      <LoadingSpinner size="medium" />
      <LoadingSpinner size="large" />
    </div>
  ),
};
