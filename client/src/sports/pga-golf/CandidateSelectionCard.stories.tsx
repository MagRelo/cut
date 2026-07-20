import type { ComponentType } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CandidateSelectedOverlay } from "../../components/platform/CandidateSelectedOverlay";
import {
  FIXTURE_CANDIDATE_DETAIL_LIVE,
  FIXTURE_CANDIDATE_DETAIL_SCHEDULED,
} from "../../test/fixtures/participantDetail";
import { CandidateSelectionCard } from "./CandidateSelectionCard";

const cardShell = (Story: ComponentType) => (
  <div className="mx-auto w-full max-w-sm bg-gray-50 p-4">
    <Story />
  </div>
);

const meta = {
  title: "Sport/PGA Golf/CandidateSelectionCard",
  component: CandidateSelectionCard,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  decorators: [cardShell],
  args: {
    candidate: FIXTURE_CANDIDATE_DETAIL_SCHEDULED,
  },
  argTypes: {
    candidate: { control: false },
  },
} satisfies Meta<typeof CandidateSelectionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Pre-tournament picker card with full season ranks and counting stats. */
export const Default: Story = {};

/** Same card as shown when the candidate is already in the lineup. */
export const Selected: Story = {
  render: (args) => (
    <div className="relative">
      <CandidateSelectedOverlay />
      <CandidateSelectionCard {...args} />
    </div>
  ),
};

/** Live fixture candidate — no OWGR, so no badge. */
export const SparseStats: Story = {
  args: {
    candidate: FIXTURE_CANDIDATE_DETAIL_LIVE,
  },
};
