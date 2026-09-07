import type { Meta, StoryObj } from "@storybook/react-vite";
import { ListHeader } from "./ListHeader";

const meta = {
  title: "Common/ListHeader",
  component: ListHeader,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof ListHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Upcoming Events",
  },
};

export const Upcoming: Story = {
  args: {
    title: "Upcoming Events",
    tone: "upcoming",
  },
};

export const Live: Story = {
  args: {
    title: "In Progress",
    tone: "live",
  },
};

export const Past: Story = {
  args: {
    title: "Past Events",
    tone: "past",
  },
};

export const LongTitle: Story = {
  args: {
    title: "Past Events",
  },
};

export const WithActions: Story = {
  args: {
    title: "In Progress",
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
