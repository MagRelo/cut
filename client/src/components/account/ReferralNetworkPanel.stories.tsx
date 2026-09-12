import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReferralSummaryNode } from "../../hooks/useUserReferralSummary";
import { ReferralNetworkPanelView } from "./ReferralNetworkPanel";

const shareUrl = "https://playthecut.com/?ref=STORYBOOK";

const directs: ReferralSummaryNode[] = [
  { id: "a", name: "Bird of Prey", parentId: null, depth: 1, color: "#2563eb" },
  { id: "b", name: "Gee Van Weenie", parentId: null, depth: 1, color: "#7c3aed" },
];

const nested: ReferralSummaryNode[] = [
  ...directs,
  { id: "c", name: "Cara", parentId: "a", depth: 2, color: "#0f766e" },
  { id: "d", name: "Dee", parentId: "a", depth: 2, color: "#c2410c" },
];

const meta = {
  title: "Account/ReferralNetworkPanel",
  component: ReferralNetworkPanelView,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    loading: false,
    error: null,
    tree: directs,
    totalEarned: 10.06,
    referralUrl: shareUrl,
  },
} satisfies Meta<typeof ReferralNetworkPanelView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithNetwork: Story = {};

export const NestedNetwork: Story = {
  args: {
    tree: nested,
    totalEarned: 42.5,
  },
};

export const EmptyNetwork: Story = {
  args: {
    tree: [],
    totalEarned: 0,
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    tree: [],
    totalEarned: 0,
  },
};

export const Error: Story = {
  args: {
    error: "Could not load referral stats.",
    tree: [],
    totalEarned: 0,
  },
};

export const WithoutLink: Story = {
  args: {
    referralUrl: null,
  },
};
