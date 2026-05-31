import type { Meta, StoryObj } from "@storybook/react-vite";
import { lobbyDecorators } from "../../../.storybook/decorators";
import { buildTimelineData } from "../../test/fixtures/contestLobby";
import {
  CHARLES_SCHWAB_CONTEST_ID,
  charlesSchwabTimelineData,
  charlesSchwabTimelineLeaderUserId,
} from "../../test/fixtures/timelineCharlesSchwab";
import { Timeline } from "./Timeline";

const meta = {
  title: "Contest/Timeline",
  component: Timeline,
  tags: ["autodocs"],
  decorators: lobbyDecorators,
  parameters: { layout: "fullscreen" },
  args: {
    defaultMetric: "score",
    allowedMetrics: ["score"],
  },
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

/** This week's Charles Schwab contest (`cmpmotf4f000x9uap786eysdq`) — 10 teams, rounds 1–3. */
export const CharlesSchwabThisWeek: Story = {
  name: "Charles Schwab (this week)",
  parameters: {
    docs: {
      description: {
        story: `Real timeline snapshots for contest \`${CHARLES_SCHWAB_CONTEST_ID}\` (Charles Schwab, ACTIVE). Re-export fixture with server script if snapshots change.`,
      },
    },
  },
  args: {
    timelineData: charlesSchwabTimelineData,
  },
};

/** Same data with the leaderboard leader highlighted (JSin). */
export const CharlesSchwabAsLeader: Story = {
  name: "Charles Schwab (current user)",
  args: {
    timelineData: charlesSchwabTimelineData,
    currentUserId: charlesSchwabTimelineLeaderUserId,
  },
};

/** Matches {@link ContestLobbyTabHero} height behavior in the lobby. */
export const CharlesSchwabFitContainer: Story = {
  name: "Charles Schwab (fit container)",
  decorators: [
    (Story) => (
      <div className="h-[280px] rounded-lg bg-white shadow">
        <Story />
      </div>
    ),
    ...lobbyDecorators,
  ],
  args: {
    timelineData: charlesSchwabTimelineData,
    currentUserId: charlesSchwabTimelineLeaderUserId,
    fitContainer: true,
  },
};

export const Default: Story = {
  args: {
    currentUserId: "user-1",
    timelineData: buildTimelineData(),
  },
};

export const MultiTeam: Story = {
  args: {
    currentUserId: "user-1",
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
