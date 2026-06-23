import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useChainId } from "wagmi";

import { DiscreteValueSlider } from "../common/DiscreteValueSlider";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import {
  CreateContestEventPicker,
  useSelectedSportEvent,
} from "../contest/CreateContestEventPicker";
import { useAuth } from "../../contexts/AuthContext";
import { useFirstEnabledSportId } from "../../hooks/useSportData";
import {
  getCreateContestStatusMessage,
  useCreateContestSubmission,
} from "../../hooks/useCreateContestSubmission";
import {
  buildContestSettings,
  computeExpiryTimestampFromTournamentEnd,
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

interface LeagueCreateContestFormProps {
  userGroupId: string;
  onContestCreated?: () => void;
}

export const LeagueCreateContestForm = ({
  userGroupId,
  onContestCreated,
}: LeagueCreateContestFormProps) => {
  const navigate = useNavigate();
  const chainId = useChainId();
  const firstSportId = useFirstEnabledSportId();
  const [sportId, setSportId] = useState("");
  useEffect(() => {
    if (!sportId && firstSportId) {
      setSportId(firstSportId);
    }
  }, [firstSportId, sportId]);
  const { selection: selectedEvent } = useSelectedSportEvent(sportId);
  const { paymentTokenSymbol, paymentTokenAddress } = useAuth();

  const [entryFeeIndex, setEntryFeeIndex] = useState(LEAGUE_ENTRY_FEE_OPTIONS.indexOf(20));
  const [inviteRewardIndex, setInviteRewardIndex] = useState(
    LEAGUE_INVITE_REWARD_PERCENTS.indexOf(LEAGUE_DEFAULT_INVITE_REWARD_PERCENT),
  );
  const [primarySubsidyIndex, setPrimarySubsidyIndex] = useState(3);

  const tokenSymbol = paymentTokenSymbol ?? "xUSDC";
  const entryFee = LEAGUE_ENTRY_FEE_OPTIONS[entryFeeIndex];
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
    maxReferralNetworkBps: 2000,
    onContestCreated: (contest) => {
      onContestCreated?.();
      navigate(contestLobbyPath(contest.address));
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedEvent?.eventId || !selectedEvent.isEditable) {
      return;
    }

    const expiryTimestamp = computeExpiryTimestampFromTournamentEnd(selectedEvent.endDate);
    const baseSettings = buildContestSettings(chainId ?? 0, paymentTokenAddress || "", tokenSymbol);

    await submitContest({
      name: selectedEvent.eventName,
      transactionId: "",
      address: "",
      chainId: chainId ?? 0,
      eventId: selectedEvent.eventId,
      userGroupId,
      settings: {
        ...baseSettings,
        primaryDeposit: entryFee,
        primaryDepositSecondarySubsidyBps: primarySubsidyPercentToBps(primarySubsidyPercent),
        referralNetworkBps: inviteRewardPercentToBps(inviteRewardPercent),
        expiryTimestamp,
        paymentTokenAddress: paymentTokenAddress || "",
        paymentTokenSymbol: tokenSymbol,
        chainId: chainId ?? 0,
      },
    });
  };

  const canCreateContest = Boolean(selectedEvent?.eventId && selectedEvent.isEditable);

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
      <CreateContestEventPicker
        sportId={sportId}
        onSportIdChange={setSportId}
        disabled={isProcessing}
      />

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

      <DiscreteValueSlider
        id="league-primary-subsidy"
        label="Winner Pool Subsidy"
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

      <DiscreteValueSlider
        id="league-invite-rewards"
        label="Invite Rewards"
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
