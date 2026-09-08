import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useChainId } from "wagmi";

import { DiscreteValueSlider } from "../common/DiscreteValueSlider";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useAuth } from "../../contexts/AuthContext";
import { defaultPaymentTokenSymbol } from "../../config/targetChain";
import {
  getCreateContestStatusMessage,
  useCreateContestSubmission,
} from "../../hooks/useCreateContestSubmission";
import {
  buildContestSettings,
  computeExpiryTimestampFromTournamentEnd,
  formatTournamentDateRange,
} from "../../lib/contestCreation";
import {
  formatInviteRewardPercent,
  formatLeagueEntryFee,
  formatPrimarySubsidyPercent,
  inviteRewardPercentToBps,
  LEAGUE_ENTRY_FEE_OPTIONS,
  LEAGUE_DEFAULT_INVITE_REWARD_PERCENT,
  LEAGUE_INVITE_REWARD_PERCENTS,
  LEAGUE_PRIMARY_SUBSIDY_PERCENTS,
  primarySubsidyPercentToBps,
} from "../../lib/leagueCreateContestOptions";
import { contestLobbyPath } from "../../utils/contestRoutes";
import { getTargetChainIdFromEnv } from "../../config/targetChain";

export interface LeagueCreateContestEvent {
  eventId: string;
  eventName: string;
  startDate: string;
  endDate: string;
  isEditable: boolean;
}

interface LeagueCreateContestFormProps {
  userGroupId: string;
  event: LeagueCreateContestEvent;
  onContestCreated?: () => void;
}

export const LeagueCreateContestForm = ({
  userGroupId,
  event,
  onContestCreated,
}: LeagueCreateContestFormProps) => {
  const navigate = useNavigate();
  const chainId = useChainId();
  const { paymentTokenSymbol, paymentTokenAddress } = useAuth();

  const [entryFeeIndex, setEntryFeeIndex] = useState(LEAGUE_ENTRY_FEE_OPTIONS.indexOf(20));
  const [inviteRewardIndex, setInviteRewardIndex] = useState(
    LEAGUE_INVITE_REWARD_PERCENTS.indexOf(LEAGUE_DEFAULT_INVITE_REWARD_PERCENT),
  );
  const [primarySubsidyIndex, setPrimarySubsidyIndex] = useState(3);

  const tokenSymbol = paymentTokenSymbol ?? defaultPaymentTokenSymbol();
  const entryFee = LEAGUE_ENTRY_FEE_OPTIONS[entryFeeIndex];
  const isFreeContest = entryFee === 0;
  const inviteRewardPercent = LEAGUE_INVITE_REWARD_PERCENTS[inviteRewardIndex];
  const primarySubsidyPercent = LEAGUE_PRIMARY_SUBSIDY_PERCENTS[primarySubsidyIndex];

  const {
    submitContest,
    loading,
    error,
    isProcessing,
    isSending,
    isConfirming,
    isFailed,
    transactionError,
  } = useCreateContestSubmission({
    onContestCreated: (contest) => {
      onContestCreated?.();
      navigate(contestLobbyPath(contest));
    },
  });

  const handleSubmit = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();

    if (!event.eventId || !event.isEditable) {
      return;
    }

    const resolvedChainId = chainId || getTargetChainIdFromEnv();
    const expiryTimestamp = computeExpiryTimestampFromTournamentEnd(event.endDate);
    const baseSettings = buildContestSettings(
      resolvedChainId,
      paymentTokenAddress || "",
      tokenSymbol,
    );

    await submitContest({
      name: event.eventName,
      chainId: resolvedChainId,
      eventId: event.eventId,
      userGroupId,
      settings: {
        ...baseSettings,
        primaryDeposit: entryFee,
        primaryDepositSecondarySubsidyBps: isFreeContest
          ? 0
          : primarySubsidyPercentToBps(primarySubsidyPercent),
        referralNetworkBps: isFreeContest ? 0 : inviteRewardPercentToBps(inviteRewardPercent),
        expiryTimestamp,
        paymentTokenAddress: paymentTokenAddress || "",
        paymentTokenSymbol: tokenSymbol,
        chainId: resolvedChainId,
      },
    });
  };

  const canCreateContest = Boolean(event.eventId && event.isEditable);
  const dateRange =
    event.startDate && event.endDate
      ? formatTournamentDateRange(event.startDate, event.endDate)
      : null;

  return (
    <form onSubmit={(formEvent) => void handleSubmit(formEvent)} className="space-y-5">
      <div>
        <p className="font-display text-sm font-medium text-gray-500">Event</p>
        <p className="mt-0.5 font-display text-lg font-semibold text-gray-900">{event.eventName}</p>
        {dateRange ? (
          <p className="mt-0.5 font-display text-sm text-gray-600">{dateRange}</p>
        ) : null}
        {!event.isEditable ? (
          <p className="mt-2 font-display text-sm text-amber-800">
            This event has started or finished — new contests cannot be created.
          </p>
        ) : null}
      </div>

      <DiscreteValueSlider
        id="league-entry-fee"
        label="Entry Fee"
        description="Entry fee per lineup"
        valueIndex={entryFeeIndex}
        valueCount={LEAGUE_ENTRY_FEE_OPTIONS.length}
        displayValue={formatLeagueEntryFee(entryFee, tokenSymbol)}
        minLabel={formatLeagueEntryFee(LEAGUE_ENTRY_FEE_OPTIONS[0], tokenSymbol)}
        maxLabel={formatLeagueEntryFee(
          LEAGUE_ENTRY_FEE_OPTIONS[LEAGUE_ENTRY_FEE_OPTIONS.length - 1],
          tokenSymbol,
        )}
        onChange={setEntryFeeIndex}
        disabled={!canCreateContest || isProcessing}
      />

      {!isFreeContest ? (
        <>
          <DiscreteValueSlider
            id="league-invite-rewards"
            label="Invite Rewards %"
            description={
              <>
                Share of contest pool paid to the invite network.{" "}
                <Link to="/faq#referral-network" className="text-blue-600 hover:underline">
                  Learn more...
                </Link>
              </>
            }
            valueIndex={inviteRewardIndex}
            valueCount={LEAGUE_INVITE_REWARD_PERCENTS.length}
            displayValue={formatInviteRewardPercent(inviteRewardPercent)}
            minLabel={formatInviteRewardPercent(LEAGUE_INVITE_REWARD_PERCENTS[0])}
            maxLabel={formatInviteRewardPercent(
              LEAGUE_INVITE_REWARD_PERCENTS[LEAGUE_INVITE_REWARD_PERCENTS.length - 1],
            )}
            onChange={setInviteRewardIndex}
            disabled={!canCreateContest || isProcessing}
          />

          <DiscreteValueSlider
            id="league-primary-subsidy"
            label="Winner Pool Subsidy %"
            description="Share of each entry fee sent to the Winner Pool—jumpstarts the pool so predictions are more fun from the start"
            valueIndex={primarySubsidyIndex}
            valueCount={LEAGUE_PRIMARY_SUBSIDY_PERCENTS.length}
            displayValue={formatPrimarySubsidyPercent(primarySubsidyPercent)}
            minLabel={formatPrimarySubsidyPercent(LEAGUE_PRIMARY_SUBSIDY_PERCENTS[0])}
            maxLabel={formatPrimarySubsidyPercent(
              LEAGUE_PRIMARY_SUBSIDY_PERCENTS[LEAGUE_PRIMARY_SUBSIDY_PERCENTS.length - 1],
            )}
            onChange={setPrimarySubsidyIndex}
            disabled={!canCreateContest || isProcessing}
          />
        </>
      ) : null}

      <button
        type="submit"
        disabled={!canCreateContest || loading || isProcessing}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        {loading || isProcessing ? (
          <span className="flex items-center gap-2">
            <LoadingSpinnerSmall />
            {getCreateContestStatusMessage(isSending, isConfirming) === "idle"
              ? "Creating…"
              : getCreateContestStatusMessage(isSending, isConfirming)}
          </span>
        ) : (
          "Create Contest"
        )}
      </button>

      {(transactionError || isFailed || error) && (
        <p className="font-display text-sm text-red-600" role="alert">
          {error || transactionError || "The transaction was rejected or failed. Please try again."}
        </p>
      )}
    </form>
  );
};
