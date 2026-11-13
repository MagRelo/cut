import type { Meta, StoryObj } from "@storybook/react-vite";
import { ContestLineupJoinFooter } from "./ContestLineupJoinActions";

const meta = {
  title: "Lineup/Contest entry footer",
  component: ContestLineupJoinFooter,
  tags: ["autodocs"],
  args: {
    entered: false,
    canJoin: true,
    canLeave: true,
    isProcessing: false,
    hasPlayers: true,
    depositLoading: false,
    depositLabel: "$10",
    onJoin: () => {},
    onLeave: () => {},
  },
  argTypes: {
    entered: { control: "boolean" },
    onJoin: { control: false },
    onLeave: { control: false },
  },
  decorators: [
    (Story) => (
      <div className="w-80 overflow-hidden rounded-sm border border-slate-300 bg-white shadow-md">
        <div className="px-3 py-4 font-display text-sm text-gray-700">Lineup</div>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ContestLineupJoinFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Toggle `entered` in Controls to switch between Enter Contest and Entered. */
export const Toggle: Story = {};

export const NotEntered: Story = {
  args: { entered: false },
};

export const Entered: Story = {
  args: { entered: true },
};
