import type { Meta, StoryObj } from "@storybook/react-vite";
import { lobbyDecorators } from "../../../.storybook/decorators";
import { buildTimelineData } from "../../test/fixtures/contestLobby";
import { Timeline } from "./Timeline";

const meta = {
  title: "Contest/Timeline",
  component: Timeline,
  tags: ["autodocs"],
  decorators: lobbyDecorators,
  parameters: { layout: "fullscreen" },
  args: {
    currentUserId: "user-1",
    defaultMetric: "score",
    allowedMetrics: ["score"],
  },
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    timelineData: buildTimelineData(),
  },
};

export const MultiTeam: Story = {
  args: {
    timelineData: buildTimelineData({
      teams: [
        ...buildTimelineData().teams,
        {
          contestLineupId: "lineup-2",
          userId: "user-2",
          name: "Player Two",
          color: "#10B981",
          entryId: "2",
          dataPoints: [
            { timestamp: new Date().toISOString(), score: 6, roundNumber: 1 },
            { timestamp: new Date(Date.now() + 3600000).toISOString(), score: 14, roundNumber: 1 },
          ],
        },
      ],
    }),
  },
};
