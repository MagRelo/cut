import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { lobbyDecorators } from "../../../.storybook/decorators";
import { EventScopeProvider, type EventScopeValue } from "../../contexts/EventScopeContext";
import { buildContestLineup, contestWithLineups } from "../../test/fixtures/contestLobby";
import { ContestEntryList } from "./ContestEntryList";

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
  title: "Contest/ContestEntryList",
  component: ContestEntryList,
  tags: ["autodocs"],
  decorators: [...lobbyDecorators, withEventScope],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ContestEntryList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PreContestOpen: Story = {
  args: {
    contestLineups: contestWithLineups.contestLineups,
    contestStatus: "OPEN",
    entryListOpensModal: false,
  },
};

export const LiveLocked: Story = {
  args: {
    contestLineups: contestWithLineups.contestLineups,
    contestStatus: "ACTIVE",
    entryListOpensModal: true,
  },
};

export const Empty: Story = {
  args: {
    contestLineups: [],
    contestStatus: "ACTIVE",
    entryListOpensModal: true,
  },
};

export const ManyEntries: Story = {
  args: {
    contestLineups: Array.from({ length: 8 }, (_, i) =>
      buildContestLineup({
        id: `lineup-${i + 1}`,
        position: i + 1,
        score: 20 - i,
        user: {
          id: `user-${i + 1}`,
          name: `Player ${i + 1}`,
          userType: "USER",
          isVerified: true,
          loginAttempts: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
    ),
    contestStatus: "LOCKED",
    entryListOpensModal: true,
  },
};

export const ReferralStakes: Story = {
  args: {
    contestLineups: [
      buildContestLineup({
        id: "lineup-direct",
        position: 1,
        score: 18,
        userId: "user-direct",
        referralStake: { depth: 1 },
        user: {
          id: "user-direct",
          name: "Direct Invitee",
          userType: "USER",
          isVerified: true,
          loginAttempts: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          settings: { color: "#10B981" },
        },
      }),
      buildContestLineup({
        id: "lineup-nested",
        position: 2,
        score: 14,
        lineupId: "tl-2",
        entryId: "2",
        userId: "user-nested",
        referralStake: { depth: 3 },
        user: {
          id: "user-nested",
          name: "Network Player",
          userType: "USER",
          isVerified: true,
          loginAttempts: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          settings: { color: "#F59E0B" },
        },
      }),
      buildContestLineup({
        id: "lineup-other",
        position: 3,
        score: 9,
        lineupId: "tl-3",
        entryId: "3",
        userId: "user-other",
        user: {
          id: "user-other",
          name: "Unrelated Player",
          userType: "USER",
          isVerified: true,
          loginAttempts: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          settings: { color: "#6B7280" },
        },
      }),
    ],
    contestStatus: "LOCKED",
    entryListOpensModal: true,
  },
};
