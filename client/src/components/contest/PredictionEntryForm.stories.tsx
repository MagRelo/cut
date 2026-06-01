import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { lobbyDecorators } from "../../../.storybook/decorators";
import { StorybookAuthProvider } from "../../contexts/AuthContext";
import { contestFixtures, contestWithPredictions } from "../../test/fixtures/contestLobby";
import {
  buildMockPredictionEntryData,
  MOCK_SECONDARY_TOTAL_FUNDS,
  MOCK_SECONDARY_TOTAL_FUNDS_FORMATTED,
} from "../../test/fixtures/contestPredictionMock";
import { PredictionEntryForm } from "./PredictionEntryForm";

const entryData = buildMockPredictionEntryData(["1", "2", "3", "4"]);

/** BigInt props are injected in `render` — Storybook controls cannot serialize them. */
const chainProps = {
  entryData,
  secondaryPrizePoolFormatted: MOCK_SECONDARY_TOTAL_FUNDS_FORMATTED,
  secondaryTotalFundsFormatted: MOCK_SECONDARY_TOTAL_FUNDS_FORMATTED,
  totalSecondaryLiquidityBefore: MOCK_SECONDARY_TOTAL_FUNDS,
  poolSnapshot: {} as const,
};

const withAuthOverride =
  (value: Parameters<typeof StorybookAuthProvider>[0]["value"]): Decorator =>
  (Story) => (
    <StorybookAuthProvider value={value}>
      <Story />
    </StorybookAuthProvider>
  );

const meta = {
  title: "Contest/PredictionEntryForm",
  component: PredictionEntryForm,
  tags: ["autodocs"],
  decorators: [
    ...lobbyDecorators,
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "fullscreen" },
  args: {
    contest: contestWithPredictions,
    entryId: "1",
    onClose: fn(),
    ...chainProps,
  },
  argTypes: {
    contest: { control: false },
    onClose: { control: false },
  },
  render: (args) => <PredictionEntryForm {...chainProps} {...args} />,
} satisfies Meta<typeof PredictionEntryForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SecondEntry: Story = {
  args: {
    entryId: "2",
  },
};

export const LockedContest: Story = {
  args: {
    contest: contestFixtures.locked,
  },
};

export const DataUnavailable: Story = {
  args: {
    entryId: "99",
  },
};

export const ConnectWallet: Story = {
  args: {},
  decorators: [withAuthOverride({ user: null })],
};

export const BalancesUnavailable: Story = {
  args: {},
  decorators: [withAuthOverride({ balancesUnavailable: true })],
};

export const InsufficientBalance: Story = {
  args: {},
  decorators: [
    withAuthOverride({
      paymentTokenBalance: 0n,
    }),
  ],
};
