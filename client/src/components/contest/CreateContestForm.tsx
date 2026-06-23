import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useChainId } from "wagmi";

import { type ContestSettings, type CreateContestInput } from "../../types/contest";
import { contestLobbyPath } from "../../utils/contestRoutes";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useAuth } from "../../contexts/AuthContext";
import { useFirstEnabledSportId } from "../../hooks/useSportData";
import {
  CreateContestEventPicker,
  useSelectedSportEvent,
} from "./CreateContestEventPicker";
import { useUserGroupsQuery } from "../../hooks/useUserGroupQuery";
import {
  buildContestSettings,
  DEFAULT_EXPIRY_DAYS_AFTER_TOURNAMENT,
} from "../../lib/contestCreation";
import {
  getCreateContestStatusMessage,
  useCreateContestSubmission,
} from "../../hooks/useCreateContestSubmission";

export const CreateContestForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lockedUserGroupId = searchParams.get("userGroupId") ?? undefined;
  const firstSportId = useFirstEnabledSportId();
  const [sportId, setSportId] = useState("");
  useEffect(() => {
    if (!sportId && firstSportId) {
      setSportId(firstSportId);
    }
  }, [firstSportId, sportId]);
  const { selection: selectedEvent } = useSelectedSportEvent(sportId);
  const { paymentTokenSymbol, paymentTokenAddress } = useAuth();
  const { data: userGroupsData } = useUserGroupsQuery();
  const chainId = useChainId();

  const adminLeagues = useMemo(
    () => userGroupsData?.userGroups?.filter((group) => group.role === "ADMIN") ?? [],
    [userGroupsData],
  );

  const [formData, setFormData] = useState<CreateContestInput>(() => ({
    name: "",
    transactionId: "",
    address: "",
    chainId: chainId ?? 0,
    eventId: selectedEvent?.eventId ?? "",
    settings: buildContestSettings(
      chainId ?? 0,
      paymentTokenAddress || "",
      paymentTokenSymbol ?? "xUSDC",
    ),
    description: undefined,
    userGroupId: undefined,
  }));

  const [expiryDaysAfterTournament, setExpiryDaysAfterTournament] = useState(
    DEFAULT_EXPIRY_DAYS_AFTER_TOURNAMENT,
  );

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
      resetForm();
      setExpiryDaysAfterTournament(DEFAULT_EXPIRY_DAYS_AFTER_TOURNAMENT);
      navigate(contestLobbyPath(contest.address));
    },
  });

  useEffect(() => {
    if (!selectedEvent?.eventId) return;
    setFormData((prev) =>
      prev.eventId === selectedEvent.eventId ? prev : { ...prev, eventId: selectedEvent.eventId },
    );
  }, [selectedEvent?.eventId]);

  useEffect(() => {
    if (lockedUserGroupId && adminLeagues.some((group) => group.id === lockedUserGroupId)) {
      setFormData((prev) => ({ ...prev, userGroupId: lockedUserGroupId }));
    }
  }, [lockedUserGroupId, adminLeagues]);

  function resetForm() {
    setFormData({
      name: "",
      transactionId: "",
      address: "",
      chainId: chainId ?? 0,
      eventId: selectedEvent?.eventId ?? "",
      settings: buildContestSettings(
        chainId ?? 0,
        paymentTokenAddress || "",
        paymentTokenSymbol ?? "xUSDC",
      ),
      description: undefined,
      userGroupId: lockedUserGroupId || undefined,
    });
  }

  const patchSettings = useCallback((patch: Partial<ContestSettings>) => {
    setFormData((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  }, []);

  useEffect(() => {
    const end = selectedEvent?.endDate;
    setFormData((prev) => {
      if (!end) {
        if (prev.settings.expiryTimestamp === 0) return prev;
        return { ...prev, settings: { ...prev.settings, expiryTimestamp: 0 } };
      }
      const ms = new Date(end).getTime() + expiryDaysAfterTournament * 24 * 60 * 60 * 1000;
      if (Number.isNaN(ms)) {
        if (prev.settings.expiryTimestamp === 0) return prev;
        return { ...prev, settings: { ...prev.settings, expiryTimestamp: 0 } };
      }
      const ts = Math.floor(ms / 1000);
      if (prev.settings.expiryTimestamp === ts) return prev;
      return { ...prev, settings: { ...prev.settings, expiryTimestamp: ts } };
    });
  }, [selectedEvent?.endDate, expiryDaysAfterTournament]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const s = formData.settings;
    const pending: CreateContestInput = {
      ...formData,
      eventId: selectedEvent?.eventId ?? "",
      chainId: chainId ?? 0,
      userGroupId: formData.userGroupId || undefined,
      settings: {
        ...s,
        paymentTokenAddress: paymentTokenAddress || "",
        paymentTokenSymbol: paymentTokenSymbol ?? "xUSDC",
        oracle: s.oracle.trim(),
        chainId: chainId ?? 0,
        expiryTimestamp: s.expiryTimestamp,
      },
    };

    await submitContest(pending);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const s = formData.settings;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto p-4">
      <div className="space-y-4 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
        <h3 className="text-lg font-semibold text-blue-900">Contest</h3>

        <CreateContestEventPicker
          sportId={sportId}
          onSportIdChange={setSportId}
          disabled={isProcessing}
        />

        <div className="space-y-2">
          <label htmlFor="name" className="block font-medium">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="primaryDeposit" className="block font-medium">
            Primary deposit (token amount, 18 decimals on-chain)
          </label>
          <p className="text-xs text-gray-600">
            Fixed Layer 1 stake per primary participant. Use <span className="font-medium">0</span> for
            a free contest (no deposit; still uses the same contract flow).
          </p>
          <div className="relative">
            <input
              type="number"
              id="primaryDeposit"
              min="0"
              step="0.01"
              value={s.primaryDeposit}
              onChange={(e) => patchSettings({ primaryDeposit: Number(e.target.value) })}
              required
              className="w-full p-2 border rounded-md pr-12"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
              {paymentTokenSymbol ?? "xUSDC"}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="referralNetworkBps" className="block font-medium">
            Invite network fee BPS (0–1000)
          </label>
          <p className="text-xs text-gray-600">
            <span className="font-mono">_referralNetworkBps</span>: share of contest TVL
            distributed to the referral network at settlement (or to the oracle if no chain).
          </p>
          <input
            type="number"
            id="referralNetworkBps"
            min={0}
            max={1000}
            step={1}
            value={s.referralNetworkBps ?? s.oracleFeeBps ?? 0}
            onChange={(e) => patchSettings({ referralNetworkBps: Number(e.target.value) })}
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="primaryDepositSecondarySubsidyBps" className="block font-medium">
            Primary deposit → secondary subsidy BPS (0–10000)
          </label>
          <p className="text-xs text-gray-600">
            <span className="font-mono">_primaryDepositSecondarySubsidyBps</span>: BPS of each
            primary deposit credited to that entry&apos;s unbacked secondary subsidy pool; the
            remainder credits the primary prize pool (see <span className="font-mono">ContestController</span>
            NatSpec).
          </p>
          <input
            type="number"
            id="primaryDepositSecondarySubsidyBps"
            min={0}
            max={10000}
            step={1}
            value={s.primaryDepositSecondarySubsidyBps}
            onChange={(e) =>
              patchSettings({ primaryDepositSecondarySubsidyBps: Number(e.target.value) })
            }
            className="w-full p-2 border rounded-md"
          />
        </div>
      </div>

      <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">Other contest settings</h3>

        <div className="space-y-2">
          <label htmlFor="userGroupId" className="block font-medium">
            League (optional)
          </label>
          {adminLeagues.length === 0 ? (
            <p className="text-sm text-gray-600">
              You are not an admin of any leagues. Leave unset to create a public contest (staff
              only).
            </p>
          ) : (
            <select
              id="userGroupId"
              name="userGroupId"
              value={formData.userGroupId || ""}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  userGroupId: e.target.value || undefined,
                }));
              }}
              disabled={!!lockedUserGroupId}
              className="w-full p-2 border rounded-md disabled:bg-gray-100 disabled:text-gray-600"
            >
              {!lockedUserGroupId && <option value="">None (public)</option>}
              {adminLeagues.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-2">
          <span className="block font-medium">Payment token</span>
          <p className="text-xs text-gray-600">
            <span className="font-mono">_paymentToken</span>: ERC20 used for all deposits,
            collateral, and payouts.
          </p>
          <div className="p-2 bg-gray-100 rounded-md font-mono text-xs break-all">
            {paymentTokenAddress || "Not configured"}
          </div>
          <p className="text-sm text-gray-600">{paymentTokenSymbol ?? "xUSDC"}</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="oracle" className="block font-medium">
            Oracle
          </label>
          <p className="text-xs text-gray-600">
            <span className="font-mono">_oracle</span>: sole address allowed to
            advance/cancel/settle the contest (<span className="font-mono">onlyOracle</span>).
          </p>
          <input
            type="text"
            id="oracle"
            value={s.oracle}
            onChange={(e) => patchSettings({ oracle: e.target.value })}
            required
            className="w-full p-2 border rounded-md font-mono text-sm"
            placeholder="0x…"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="expiryDaysAfterTournament" className="block font-medium">
            Days after tournament end (expiry = tournament end + this)
          </label>
          <p className="text-xs text-gray-600">
            Off-chain helper only: sets `_expiryTimestamp` (unix seconds) passed to the
            controller—contest expiration used for refunds and timing per contract rules.
          </p>
          <input
            type="number"
            id="expiryDaysAfterTournament"
            min={0}
            step={1}
            value={expiryDaysAfterTournament}
            onChange={(e) => setExpiryDaysAfterTournament(Number(e.target.value) || 0)}
            className="w-full p-2 border rounded-md"
          />
          <div className="p-2 bg-white border rounded-md text-sm">
            {selectedEvent?.endDate
              ? new Date(
                  new Date(selectedEvent.endDate).getTime() +
                    expiryDaysAfterTournament * 24 * 60 * 60 * 1000,
                ).toLocaleString()
              : "Event not selected"}
          </div>
          <p className="text-sm text-gray-600">
            Event end:{" "}
            {selectedEvent?.endDate
              ? new Date(selectedEvent.endDate).toLocaleString()
              : "Not available"}
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="expiryTimestamp" className="block font-medium">
            Expiry timestamp (Unix seconds — `_expiryTimestamp`)
          </label>
          <p className="text-xs text-gray-600">
            <span className="font-mono">_expiryTimestamp</span>: unix time when the contest expires;
            used for refund and timing behavior described in the controller. Filled from tournament
            end + days above; you can edit the Unix timestamp directly.
          </p>
          <input
            type="number"
            id="expiryTimestamp"
            min={1}
            step={1}
            value={s.expiryTimestamp}
            onChange={(e) =>
              patchSettings({ expiryTimestamp: Math.max(0, Math.floor(Number(e.target.value))) })
            }
            required
            className="w-full p-2 border rounded-md font-mono text-sm"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading || isProcessing}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed mt-2"
        >
          {loading || isProcessing ? (
            <div className="flex items-center gap-2 w-full justify-center">
              <LoadingSpinnerSmall />
              {getCreateContestStatusMessage(isSending, isConfirming)}
            </div>
          ) : (
            "Create Contest"
          )}
        </button>
      </div>

      <div className="mt-2 text-sm text-center text-red-500">
        {(transactionError || isFailed) && (
          <div>
            {transactionError ||
              "The transaction was rejected or failed to execute. Please try again."}
          </div>
        )}
        {error && <div>Server Error: {error}</div>}
      </div>
    </form>
  );
};
