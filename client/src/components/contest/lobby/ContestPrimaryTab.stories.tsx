import type { Meta, StoryObj } from "@storybook/react-vite";
import { lobbyDecorators } from "../../../../.storybook/decorators";
import {
  contestFixtures,
  contestTimelineFixture,
  contestWithLineups,
  contestWithTimeline,
} from "../../../test/fixtures/contestLobby";
import { ContestPrimaryTab } from "./ContestPrimaryTab";

const meta = {
  title: "Contest/Lobby/ContestPrimaryTab",
  component: ContestPrimaryTab,
  tags: ["autodocs"],
  decorators: lobbyDecorators,
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
