import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { lobbyDecorators } from "../../../../../.storybook/decorators";
import { buildSideBetSelectionsFixture } from "../../../../test/fixtures/sideBetMock";
import { MAX_TICKET_PAYOUT_USD } from "../shared/sideBetConstants";
import { formatStakeInputLine } from "../shared/sideBetFormatters";
import { SideBetPlaceForm } from "./SideBetPlaceForm";

const selection = buildSideBetSelectionsFixture()[0];

const defaultDisplayArgs = {
  activeSelection: selection,
  borderColor: "#3B82F6",
  userLabel: "Storybook User",
  lineupNumberLabel: "Lineup #1",
  playerLastNamesLine: "Scheffler, McIlroy, Rahm, Schauffele",
  bettable: true,
  placeError: null as string | null,
  paymentTxError: null as string | null,
  isPayingOracle: false,
  isRecording: false,
  onCancel: fn(),
  onPlaceTicket: fn(),
};

function computePayoutPreview(stakeInput: string, decimalOdds: number) {
  const stake = parseFloat(stakeInput);
  if (!Number.isFinite(stake) || stake <= 0 || !Number.isFinite(decimalOdds) || decimalOdds <= 1) {
    return null;
  }
  return { totalReturn: stake * decimalOdds, profit: stake * (decimalOdds - 1) };
}

function InteractivePlaceForm(
  props: Omit<
    React.ComponentProps<typeof SideBetPlaceForm>,
    "stakeInput" | "onStakeInputChange" | "modalStakeTicketLine" | "payoutPreview" | "exceedsMaxTicketPayout"
  > & { initialStake?: string },
) {
  const { initialStake = "10", activeSelection, ...rest } = props;
  const [stakeInput, setStakeInput] = useState(initialStake);
  const modalStakeTicketLine = formatStakeInputLine(stakeInput);
  const payoutPreview = useMemo(
    () => computePayoutPreview(stakeInput, activeSelection.decimalOdds),
    [stakeInput, activeSelection.decimalOdds],
  );
  const exceedsMaxTicketPayout =
    payoutPreview !== null && payoutPreview.totalReturn >= MAX_TICKET_PAYOUT_USD;

  return (
    <SideBetPlaceForm
      {...rest}
      activeSelection={activeSelection}
      stakeInput={stakeInput}
      onStakeInputChange={setStakeInput}
      modalStakeTicketLine={modalStakeTicketLine}
      payoutPreview={payoutPreview}
      exceedsMaxTicketPayout={exceedsMaxTicketPayout}
    />
  );
}

const meta = {
  title: "Lineup/SideBet/PlaceForm",
  component: SideBetPlaceForm,
  tags: ["autodocs"],
  decorators: [
    ...lobbyDecorators,
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  render: (args) => <InteractivePlaceForm {...defaultDisplayArgs} {...args} />,
  args: defaultDisplayArgs,
} satisfies Meta<typeof SideBetPlaceForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ValidationError: Story = {
  args: {
    placeError: "Connect your wallet to pay the stake.",
  },
};

export const ExceedsCap: Story = {
  render: (args) => <InteractivePlaceForm {...defaultDisplayArgs} {...args} initialStake="1000" />,
};

export const ConfirmInWallet: Story = {
  args: {
    isPayingOracle: true,
  },
};

export const Recording: Story = {
  args: {
    isRecording: true,
  },
};
