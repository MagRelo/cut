import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { lobbyDecorators } from "../../../.storybook/decorators";
import { resetStorybookLineups } from "../../../.storybook/mocks/useLineupData";
import {
  buildContestLineupForCard,
  lineupContestCardStoryDefaults,
} from "../../test/fixtures/lineupContestCardMock";
import { LineupContestCard } from "./LineupContestCard";

const withLineupRoster =
  (eventParticipantIds: string[]): Decorator =>
  (Story) => {
    resetStorybookLineups(eventParticipantIds);
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
  decorators: [withLineupRoster(["ep-scheffler", "ep-mcilroy"])],
  args: {
    lineup: buildContestLineupForCard(["ep-scheffler", "ep-mcilroy"]),
  },
};

/** Full roster — each slot shows Edit to swap a player. */
export const EditingFull: Story = {
  decorators: [
    withLineupRoster(["ep-scheffler", "ep-mcilroy", "ep-rahm", "ep-schauffele"]),
  ],
  args: {
    lineup: buildContestLineupForCard(["ep-scheffler", "ep-mcilroy", "ep-rahm", "ep-schauffele"]),
  },
};

/** Editable roster with tie-breaker slider (Storybook mock save). */
export const WithTieBreakerSlider: Story = {
  decorators: [withLineupRoster(["ep-scheffler", "ep-mcilroy"])],
  args: {
    lineup: buildContestLineupForCard(["ep-scheffler", "ep-mcilroy"]),
  },
};

/** Locked tournament — tie-breaker shown read-only instead of slider. */
export const LockedWithTieBreaker: Story = {
  decorators: [withLineupRoster(["ep-scheffler", "ep-mcilroy", "ep-rahm", "ep-schauffele"])],
  args: {
    lineup: buildContestLineupForCard(["ep-scheffler", "ep-mcilroy", "ep-rahm", "ep-schauffele"]),
    isEditable: false,
  },
};
