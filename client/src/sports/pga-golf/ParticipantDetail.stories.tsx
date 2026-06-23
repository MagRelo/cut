import type { ComponentType } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { withActiveEventFixture } from "../../../.storybook/decorators/activeEventFixture";
import {
  FIXTURE_CANDIDATE_DETAIL_COMPLETE,
  FIXTURE_CANDIDATE_DETAIL_LIVE,
  FIXTURE_CANDIDATE_DETAIL_SCHEDULED,
  PARTICIPANT_DETAIL_FIXTURE_EVENT_ID,
} from "../../test/fixtures/participantDetail";
import { GolfParticipantDetail } from "./ParticipantDetail";

const detailShell = (Story: ComponentType) => (
  <div className="mx-auto w-full max-w-modal rounded-sm bg-gray-50 p-2">
    <Story />
  </div>
);

const meta = {
  title: "Sport/PGA Golf/ParticipantDetail",
  component: GolfParticipantDetail,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  decorators: [detailShell],
  args: {
    candidate: FIXTURE_CANDIDATE_DETAIL_LIVE,
    status: "LIVE",
    rowTrailing: "share",
  },
  argTypes: {
    candidate: { control: false },
    onShare: { action: "share" },
  },
} satisfies Meta<typeof GolfParticipantDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LiveInProgress: Story = {
  decorators: [
    withActiveEventFixture({
      status: "LIVE",
      eventId: PARTICIPANT_DETAIL_FIXTURE_EVENT_ID,
      eventMetadata: {
        name: "Storybook Open",
        status: "IN_PROGRESS",
        roundDisplay: "R2",
        currentRound: 2,
      },
      candidates: [FIXTURE_CANDIDATE_DETAIL_LIVE],
    }),
  ],
  args: {
    candidate: FIXTURE_CANDIDATE_DETAIL_LIVE,
    status: "LIVE",
  },
};

export const Scheduled: Story = {
  decorators: [
    withActiveEventFixture({
      status: "SCHEDULED",
      eventId: PARTICIPANT_DETAIL_FIXTURE_EVENT_ID,
      eventMetadata: {
        name: "Storybook Open",
        status: "NOT_STARTED",
        roundDisplay: "R1",
        currentRound: 1,
      },
      candidates: [FIXTURE_CANDIDATE_DETAIL_SCHEDULED],
    }),
  ],
  args: {
    candidate: FIXTURE_CANDIDATE_DETAIL_SCHEDULED,
    status: "SCHEDULED",
  },
};

export const Complete: Story = {
  decorators: [
    withActiveEventFixture({
      status: "COMPLETE",
      eventId: PARTICIPANT_DETAIL_FIXTURE_EVENT_ID,
      eventMetadata: {
        name: "Storybook Open",
        status: "OFFICIAL",
        roundDisplay: "R4",
        currentRound: 4,
      },
      candidates: [FIXTURE_CANDIDATE_DETAIL_COMPLETE],
    }),
  ],
  args: {
    candidate: FIXTURE_CANDIDATE_DETAIL_COMPLETE,
    status: "COMPLETE",
  },
};

export const ScorecardTrailingIcon: Story = {
  decorators: LiveInProgress.decorators,
  args: {
    candidate: FIXTURE_CANDIDATE_DETAIL_LIVE,
    status: "LIVE",
    rowTrailing: "scorecard",
  },
};
