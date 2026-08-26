import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { lobbyDecorators } from "../../../.storybook/decorators";
import { withActiveEventFixture } from "../../../.storybook/decorators/activeEventFixture";
import { FIXTURE_CANDIDATES } from "../../test/fixtures/candidates";
import { lineupContestCardStoryDefaults } from "../../test/fixtures/lineupContestCardMock";
import { GuestLineupPicker } from "./GuestLineupPicker";

const cardShell: Decorator = (Story) => (
  <div className="overflow-hidden rounded-sm border border-gray-300 bg-white shadow-md">
    <Story />
  </div>
);

const meta = {
  title: "Lineup/GuestLineupPicker",
  component: GuestLineupPicker,
  tags: ["autodocs"],
  decorators: [
    ...lobbyDecorators,
    cardShell,
    withActiveEventFixture({
      eventId: lineupContestCardStoryDefaults.eventId,
      status: "SCHEDULED",
      candidates: FIXTURE_CANDIDATES,
    }),
  ],
  parameters: { layout: "fullscreen" },
  args: {
    sportId: lineupContestCardStoryDefaults.sportId,
    eventId: lineupContestCardStoryDefaults.eventId,
    eventStatus: lineupContestCardStoryDefaults.eventStatus,
  },
} satisfies Meta<typeof GuestLineupPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty slots — guests can open the picker without signing in. */
export const Empty: Story = {};

/** Two players selected locally — remaining slots still empty. */
export const Partial: Story = {
  args: {
    initialCandidates: [FIXTURE_CANDIDATES[0], FIXTURE_CANDIDATES[1]],
  },
};
