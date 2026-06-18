import type { Meta, StoryObj } from "@storybook/react-vite";
import { PageHeader } from "./PageHeader";

const meta = {
  title: "Common/PageHeader",
  component: PageHeader,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Live Contests",
  },
};

export const LongTitle: Story = {
  args: {
    title: "Frequently Asked Questions",
  },
};

export const WithActions: Story = {
  args: {
    title: "Contests",
    actions: (
      <button
        type="button"
        className="rounded-sm bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
      >
        Create contest
      </button>
    ),
  },
};
