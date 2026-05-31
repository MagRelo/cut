import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { lobbyDecorators } from "../../../.storybook/decorators";
import { resetStorybookLineups } from "../../../.storybook/mocks/useLineupData";
import {
  buildContestLineupForCard,
  lineupContestCardStoryDefaults,
} from "../../test/fixtures/lineupContestCardMock";
import { LineupContestCard } from "./LineupContestCard";

const withLineupRoster =
  (playerIds: string[]): Decorator =>
  (Story) => {
    resetStorybookLineups(playerIds);
    return <Story />;
  };

const cardShell: Decorator = (Story) => (
  <div className="rounded-sm border border-gray-200 bg-white">
    <Story />
  </div>
);

const meta = {
  title: "Lineup/LineupContestCard",
  component: LineupContestCard,
  tags: ["autodocs"],
  decorators: [...lobbyDecorators, cardShell],
  parameters: { layout: "fullscreen" },
  args: {
    ...lineupContestCardStoryDefaults,
    lineup: buildContestLineupForCard(),
  },
  argTypes: {
    lineup: { control: false },
    contests: { control: false },
  },
} satisfies Meta<typeof LineupContestCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** All four slots empty — Add buttons for each slot. */
export const EditingEmpty: Story = {
  decorators: [withLineupRoster([])],
  args: {
    lineup: buildContestLineupForCard([]),
  },
};

/** Two players selected, two open slots — mix of Edit and Add actions. */
export const EditingPartial: Story = {
  decorators: [withLineupRoster(["p-scheffler", "p-mcilroy"])],
  args: {
    lineup: buildContestLineupForCard(["p-scheffler", "p-mcilroy"]),
  },
};

/** Full roster — each slot shows Edit to swap a player. */
export const EditingFull: Story = {
  decorators: [
    withLineupRoster(["p-scheffler", "p-mcilroy", "p-rahm", "p-schauffele"]),
  ],
  args: {
    lineup: buildContestLineupForCard(["p-scheffler", "p-mcilroy", "p-rahm", "p-schauffele"]),
  },
};

/** Lineup with no contest entries — Contests tab shows the warning state. */
export const EditingNoContests: Story = {
  decorators: [withLineupRoster(["p-scheffler", "p-mcilroy"])],
  args: {
    lineup: buildContestLineupForCard(["p-scheffler", "p-mcilroy"]),
    contests: [],
  },
};
