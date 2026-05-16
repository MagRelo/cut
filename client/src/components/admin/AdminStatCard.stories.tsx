import type { Meta, StoryObj } from "@storybook/react-vite";
import { AdminStatCard } from "./AdminStatCard";

const meta = {
  title: "Admin/Stat card",
  component: AdminStatCard,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div className="grid max-w-sm gap-3">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AdminStatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Active contests",
    value: 12,
    hint: "Open or in progress",
  },
};

export const Warning: Story = {
  args: {
    label: "Pending settlements",
    value: 3,
    variant: "warning",
    hint: "Requires oracle action",
  },
};

export const Success: Story = {
  args: {
    label: "Settled this week",
    value: 28,
    variant: "success",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="grid gap-3 sm:grid-cols-3">
      <AdminStatCard label="Users" value="1,204" />
      <AdminStatCard label="Alerts" value={2} variant="warning" hint="Check cron logs" />
      <AdminStatCard label="Volume" value="$4.2k" variant="success" />
    </div>
  ),
};
