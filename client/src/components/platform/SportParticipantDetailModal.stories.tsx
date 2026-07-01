import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withActiveEventFixture } from "../../../.storybook/decorators/activeEventFixture";
import {
  FIXTURE_CANDIDATE_DETAIL_LIVE,
  PARTICIPANT_DETAIL_FIXTURE_EVENT_ID,
} from "../../test/fixtures/participantDetail";
import { SportParticipantDetailModal } from "./SportParticipantDetailModal";

const meta = {
  title: "Platform/SportParticipantDetailModal",
  component: SportParticipantDetailModal,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    withActiveEventFixture({
      status: "LIVE",
      eventId: PARTICIPANT_DETAIL_FIXTURE_EVENT_ID,
      eventMetadata: {
        name: "Storybook Open",
        status: "IN_PROGRESS",
        periodDisplay: "R2",
        currentPeriod: 2,
      },
      candidates: [FIXTURE_CANDIDATE_DETAIL_LIVE],
    }),
  ],
  args: {
    isOpen: true,
    onClose: fn(),
    candidate: FIXTURE_CANDIDATE_DETAIL_LIVE,
    sportId: "pga-golf",
    status: "LIVE",
    onShare: fn(),
  },
  argTypes: {
    candidate: { control: false },
  },
} satisfies Meta<typeof SportParticipantDetailModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};

export const Interactive: Story = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    const [candidate, setCandidate] = useState(FIXTURE_CANDIDATE_DETAIL_LIVE);

    return (
      <div className="flex min-h-[24rem] flex-col items-center justify-center gap-4 p-6">
        <button
          type="button"
          className="rounded-sm bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          onClick={() => {
            setCandidate(FIXTURE_CANDIDATE_DETAIL_LIVE);
            setOpen(true);
          }}
        >
          Open player scorecard
        </button>
        <SportParticipantDetailModal
          {...args}
          isOpen={open}
          candidate={open ? candidate : null}
          onClose={() => setOpen(false)}
        />
      </div>
    );
  },
  args: {
    isOpen: false,
  },
};
