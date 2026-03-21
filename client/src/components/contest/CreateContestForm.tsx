import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useChainId } from "wagmi";
import { decodeEventLog, isAddress } from "viem";

import { type ContestSettings, type CreateContestInput } from "../../types/contest";
import { useCreateContest as useCreateContestMutation } from "../../hooks/useContestMutations";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useCreateContest } from "../../hooks/useContestFactory";
import ContestFactoryContract from "../../utils/contracts/ContestFactory.json";
import { usePortoAuth } from "../../contexts/PortoAuthContext";
import { useCurrentTournament } from "../../hooks/useTournamentData";
import { useUserGroupsQuery } from "../../hooks/useUserGroupQuery";

import { getContractAddress } from "../../utils/blockchainUtils.tsx";

const getStatusMessages = (
  defaultMessage: string = "idle",
  isUserWaiting: boolean = false,
  isBlockchainWaiting: boolean = false,
): string => {
  if (isUserWaiting) return "User confirmation...";
  if (isBlockchainWaiting) return "Network confirmation...";
  return defaultMessage;
};

/** Defaults aligned with `ContestController` / `ContestFactory.createContest` constructor args where applicable. */
function buildContestSettings(
  chainId: number,
  paymentTokenAddress: string,
  paymentTokenSymbol: string,
): ContestSettings {
  return {
    contestType: "PUBLIC", // app-only visibility; not on-chain
    chainId, // app / API routing; not passed to factory
    expiryTimestamp: 0, // `_expiryTimestamp`: filled from tournament end + “days after” (or manual)
    paymentTokenAddress, // `_paymentToken`: ERC20 for deposits and payouts
    paymentTokenSymbol, // display only
    oracle: import.meta.env.VITE_ORACLE_ADDRESS || "", // `_oracle`: address that drives contest lifecycle (onlyOracle)
    primaryDeposit: 10, // `_primaryDepositAmount`: fixed stake per primary participant
    oracleFeeBps: Number(import.meta.env.VITE_ORACLE_FEE_BPS) || 500, // `_oracleFeeBps`: oracle cut of settlement, basis points (100 = 1%)
    positionBonusShareBps: Number(import.meta.env.VITE_POSITION_BONUS_SHARE_BPS) || 5000, // `_positionBonusShareBps`: share of accumulated subsidy → position bonuses; rest → prize pool (at settlement)
    targetPrimaryShareBps: Number(import.meta.env.VITE_TARGET_PRIMARY_SHARE_BPS) || 6000, // `_targetPrimaryShareBps`: target primary-side weight when balancing cross-subsidies between pools
    maxCrossSubsidyBps: Number(import.meta.env.VITE_MAX_CROSS_SUBSIDY_BPS) || 1500, // `_maxCrossSubsidyBps`: max fraction of any one deposit that may be reallocated to the other pool
  };
}

export const CreateContestForm = () => {
  const navigate = useNavigate();
  const { tournament: currentTournament } = useCurrentTournament();
  const createContestMutation = useCreateContestMutation();
  const { platformTokenSymbol, platformTokenAddress } = usePortoAuth();
  const { data: userGroupsData } = useUserGroupsQuery();
  const chainId = useChainId();

  const defaultExpiryDaysAfterTournament = 7;

  const [formData, setFormData] = useState<CreateContestInput>(() => ({
    name: "",
    transactionId: "",
    address: "",
    chainId: chainId ?? 0,
    tournamentId: currentTournament?.id ?? "",
    settings: buildContestSettings(
      chainId ?? 0,
      platformTokenAddress || "",
      platformTokenSymbol ?? "",
    ),
    description: undefined,
    userGroupId: undefined,
  }));

  const [expiryDaysAfterTournament, setExpiryDaysAfterTournament] = useState(
    defaultExpiryDaysAfterTournament,
  );
  const [pendingContestData, setPendingContestData] = useState<CreateContestInput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      name: "",
      transactionId: "",
      address: "",
      chainId: chainId ?? 0,
      tournamentId: currentTournament?.id ?? "",
      settings: buildContestSettings(
        chainId ?? 0,
        platformTokenAddress || "",
        platformTokenSymbol ?? "",
      ),
      description: undefined,
      userGroupId: undefined,
    });
  };

  const {
    execute,
    isProcessing,
    isSending,
    isConfirming,
    isConfirmed,
    isFailed,
    error: transactionError,
    createContestCalls,
  } = useCreateContest({
    onSuccess: async (statusData: unknown) => {
      if (!pendingContestData) return;

      setLoading(true);
      try {
        const tx = statusData as {
          receipts?: Array<{
            transactionHash?: string;
            logs?: Array<{
              address?: string;
              data?: `0x${string}`;
              topics?: readonly `0x${string}`[];
            }>;
          }>;
        };
        let contestAddress: string | undefined;
        const contestFactoryAddress = getContractAddress(chainId ?? 0, "contestFactoryAddress");

        if (tx.receipts && tx.receipts.length > 0) {
          for (const receipt of tx.receipts) {
            if (receipt.logs && receipt.logs.length > 0) {
              for (const log of receipt.logs) {
                if (log.address?.toLowerCase() === contestFactoryAddress?.toLowerCase()) {
                  try {
                    const decodedLog = decodeEventLog({
                      abi: ContestFactoryContract.abi,
                      data: log.data!,
                      topics: log.topics as [signature: `0x${string}`, ...args: `0x${string}`[]],
                    });

                    if (
                      decodedLog.eventName === "ContestCreated" &&
                      decodedLog.args &&
                      typeof decodedLog.args === "object" &&
                      "contest" in decodedLog.args
                    ) {
                      contestAddress = decodedLog.args.contest as string;
                      break;
                    }
                  } catch (decodeError) {
                    console.debug("Could not decode log, skipping:", decodeError);
                  }
                }
              }
            }
            if (contestAddress) break;
          }
        }

        if (!contestAddress) {
          throw new Error("No contest address found in transaction logs");
        }

        createContestMutation.mutate(
          {
            ...pendingContestData,
            transactionId: tx.receipts?.[0]?.transactionHash || "",
            address: contestAddress,
          },
          {
            onSuccess: (contest) => {
              resetForm();
              setExpiryDaysAfterTournament(defaultExpiryDaysAfterTournament);
              setPendingContestData(null);
              setLoading(false);
              navigate(`/contest/${contest.id}`);
            },
            onError: (err) => {
              console.error("Error creating contest in backend:", err);
              setError("Failed to create contest in backend");
              setLoading(false);
            },
          },
        );
      } catch (err) {
        console.error("Error processing transaction:", err);
        setError("Failed to process transaction");
        setLoading(false);
      }
    },
    onError: () => {
      setError("Blockchain transaction failed. Please try again.");
      setPendingContestData(null);
      setLoading(false);
    },
  });

  const patchSettings = useCallback((patch: Partial<ContestSettings>) => {
    setFormData((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  }, []);

  useEffect(() => {
    const end = currentTournament?.endDate;
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
  }, [currentTournament?.endDate, expiryDaysAfterTournament]);

  useEffect(() => {
    if (pendingContestData && isConfirmed) {
      setPendingContestData(null);
    }
  }, [pendingContestData, isConfirmed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const s = formData.settings;
    const oracle = s.oracle.trim();
    if (!oracle || !isAddress(oracle)) {
      setError("Enter a valid oracle address.");
      return;
    }

    if (s.oracleFeeBps < 0 || s.oracleFeeBps > 1000) {
      setError("Oracle fee must be between 0 and 1000 basis points (0–10%).");
      return;
    }

    if (s.positionBonusShareBps < 0 || s.positionBonusShareBps > 10000) {
      setError("Position bonus share must be between 0 and 10000 basis points.");
      return;
    }
    if (s.targetPrimaryShareBps < 0 || s.targetPrimaryShareBps > 10000) {
      setError("Target primary share must be between 0 and 10000 basis points.");
      return;
    }
    if (s.maxCrossSubsidyBps < 0 || s.maxCrossSubsidyBps > 10000) {
      setError("Max cross-subsidy must be between 0 and 10000 basis points.");
      return;
    }

    if (s.expiryTimestamp <= 0) {
      setError(
        "Set a valid expiry (`_expiryTimestamp`): choose a tournament and days after end, or enter Unix seconds.",
      );
      return;
    }

    const paymentToken = platformTokenAddress || "";
    if (!paymentToken) {
      setError("Payment token is not configured.");
      return;
    }

    const pending: CreateContestInput = {
      ...formData,
      tournamentId: currentTournament?.id ?? "",
      chainId: chainId ?? 0,
      userGroupId: formData.userGroupId || undefined,
      settings: {
        ...s,
        paymentTokenAddress: paymentToken,
        paymentTokenSymbol: platformTokenSymbol ?? "",
        oracle,
        chainId: chainId ?? 0,
        expiryTimestamp: s.expiryTimestamp,
      },
    };

    setPendingContestData(pending);

    const primaryDepositAmount = BigInt(Math.floor(s.primaryDeposit * 1e18));
    // `ContestFactory.createContest` → `ContestController` constructor (same order as Solidity NatSpec).
    const calls = createContestCalls(
      paymentToken, // paymentToken — ERC20 for all deposits and payouts
      oracle, // oracle — lifecycle control (activate, lock, settle, cancel, etc.)
      primaryDepositAmount, // contestantDepositAmount / _primaryDepositAmount — fixed primary entry stake
      s.oracleFeeBps, // oracleFee — fee to oracle at settlement (bps, cap enforced on-chain)
      BigInt(s.expiryTimestamp), // expiry — unix seconds; after this, refund paths apply per contract rules
      s.positionBonusShareBps, // positionBonusShareBps — subsidy split to primary position bonuses vs prize pool
      s.targetPrimaryShareBps, // targetPrimaryShareBps — cross-subsidy balancing target for primary vs secondary pools
      s.maxCrossSubsidyBps, // maxCrossSubsidyBps — per-deposit cap on redirecting funds between pools
    );

    await execute(calls);
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
          <label htmlFor="userGroupId" className="block font-medium">
            User group (optional)
          </label>
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
            className="w-full p-2 border rounded-md"
          >
            <option value="">None (public)</option>
            {userGroupsData?.userGroups?.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="primaryDeposit" className="block font-medium">
            Primary deposit (token amount, 18 decimals on-chain)
          </label>
          <p className="text-xs text-gray-600">
            ContestController: fixed amount each Layer 1 (primary) participant must deposit to
            enter.
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
              {platformTokenSymbol}
            </div>
          </div>
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
            {currentTournament?.endDate
              ? new Date(
                  new Date(currentTournament.endDate).getTime() +
                    expiryDaysAfterTournament * 24 * 60 * 60 * 1000,
                ).toLocaleString()
              : "Tournament not selected"}
          </div>
          <p className="text-sm text-gray-600">
            Tournament end:{" "}
            {currentTournament?.endDate
              ? new Date(currentTournament.endDate).toLocaleString()
              : "Not available"}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">ContestController constructor</h3>
        <p className="text-xs text-gray-600">
          These values are forwarded by{" "}
          <span className="font-mono">ContestFactory.createContest</span> into{" "}
          <span className="font-mono">ContestController</span> immutables (NatSpec: orchestrates
          primary competition, oracle settlement, and secondary LMSR mechanics).
        </p>

        <div className="space-y-2">
          <span className="block font-medium">Payment token</span>
          <p className="text-xs text-gray-600">
            <span className="font-mono">_paymentToken</span>: ERC20 used for all deposits,
            collateral, and payouts.
          </p>
          <div className="p-2 bg-gray-100 rounded-md font-mono text-xs break-all">
            {platformTokenAddress || "Not configured"}
          </div>
          <p className="text-sm text-gray-600">{platformTokenSymbol}</p>
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

        <div className="space-y-2">
          <label htmlFor="oracleFeeBps" className="block font-medium">
            Oracle fee BPS (0–1000)
          </label>
          <p className="text-xs text-gray-600">
            <span className="font-mono">_oracleFeeBps</span>: fee to the oracle in basis points
            (e.g. 100 = 1%), accumulated at settlement and claimable by the oracle.
          </p>
          <input
            type="number"
            id="oracleFeeBps"
            min={0}
            max={1000}
            step={1}
            value={s.oracleFeeBps}
            onChange={(e) => patchSettings({ oracleFeeBps: Number(e.target.value) })}
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="positionBonusShareBps" className="block font-medium">
            Position bonus share BPS (0–10000)
          </label>
          <p className="text-xs text-gray-600">
            <span className="font-mono">_positionBonusShareBps</span>: fraction of accumulated
            cross-subsidy allocated to primary position bonuses; remainder boosts the primary prize
            pool (applied at settlement, not per deposit).
          </p>
          <input
            type="number"
            id="positionBonusShareBps"
            min={0}
            max={10000}
            step={1}
            value={s.positionBonusShareBps}
            onChange={(e) => patchSettings({ positionBonusShareBps: Number(e.target.value) })}
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="targetPrimaryShareBps" className="block font-medium">
            Target primary share BPS (0–10000)
          </label>
          <p className="text-xs text-gray-600">
            <span className="font-mono">_targetPrimaryShareBps</span>: target share of combined pool
            weight on the primary (Layer 1) side when the contract rebalances cross-subsidies vs the
            secondary pool.
          </p>
          <input
            type="number"
            id="targetPrimaryShareBps"
            min={0}
            max={10000}
            step={1}
            value={s.targetPrimaryShareBps}
            onChange={(e) => patchSettings({ targetPrimaryShareBps: Number(e.target.value) })}
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="maxCrossSubsidyBps" className="block font-medium">
            Max cross-subsidy BPS (0–10000)
          </label>
          <p className="text-xs text-gray-600">
            <span className="font-mono">_maxCrossSubsidyBps</span>: upper bound (basis points of
            each deposit) on how much collateral can be redirected between primary and secondary
            prize pools in one step.
          </p>
          <input
            type="number"
            id="maxCrossSubsidyBps"
            min={0}
            max={10000}
            step={1}
            value={s.maxCrossSubsidyBps}
            onChange={(e) => patchSettings({ maxCrossSubsidyBps: Number(e.target.value) })}
            className="w-full p-2 border rounded-md"
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
              {getStatusMessages("idle", isSending, isConfirming)}
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
