import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { lobbyDecorators } from "../../../../.storybook/decorators";
import { EventScopeProvider, type EventScopeValue } from "../../../contexts/EventScopeContext";
import {
  contestFixtures,
  contestTimelineFixture,
  contestWithLineups,
  contestWithTimeline,
} from "../../../test/fixtures/contestLobby";
import { ContestPrimaryTab } from "./ContestPrimaryTab";

const storyEventScope: EventScopeValue = {
  kind: "contest",
  sportId: "pga-golf",
  eventId: "event-1",
  metadata: { status: "IN_PROGRESS", name: "Weekend Cut" },
  status: "LIVE",
  eventShell: {
    id: "event-1",
    sportId: "pga-golf",
    externalId: "R2026001",
    isActive: true,
    metadata: { status: "IN_PROGRESS", name: "Weekend Cut" },
  },
  error: null,
};

const withEventScope: Decorator = (Story) => (
  <EventScopeProvider value={storyEventScope}>
    <Story />
  </EventScopeProvider>
);

const meta = {
  title: "Contest/Lobby/ContestPrimaryTab",
  component: ContestPrimaryTab,
  tags: ["autodocs"],
  decorators: [...lobbyDecorators, withEventScope],
  parameters: { layout: "fullscreen" },
  args: {
    currentUserId: "user-1",
  },
} satisfies Meta<typeof ContestPrimaryTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EnterContest: Story = {
  args: {
    contest: contestFixtures.open,
    mode: "enterContest",
    entryListOpensModal: false,
  },
};

export const LiveTimeline: Story = {
  args: {
    contest: contestWithTimeline,
    mode: "liveTimeline",
    entryListOpensModal: true,
    timelineData: contestTimelineFixture,
  },
};

export const WithEntries: Story = {
  args: {
    contest: contestWithLineups,
    mode: "liveTimeline",
    entryListOpensModal: true,
  },
};

export const Loading: Story = {
  args: {
    contest: contestFixtures.active,
    mode: "liveTimeline",
    entryListOpensModal: true,
    isContestDataPending: true,
    isTimelineLoading: true,
  },
};
