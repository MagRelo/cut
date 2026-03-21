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
  isBlockchainWaiting: boolean = false
): string => {
  if (isUserWaiting) return "User confirmation...";
  if (isBlockchainWaiting) return "Network confirmation...";
  return defaultMessage;
};

function buildContestSettings(
  chainId: number,
  paymentTokenAddress: string,
  paymentTokenSymbol: string
): ContestSettings {
  return {
    contestType: "PUBLIC",
    chainId,
    paymentTokenAddress,
    paymentTokenSymbol,
    oracle: import.meta.env.VITE_ORACLE_ADDRESS || "",
    primaryDeposit: 10,
    oracleFeeBps: Number(import.meta.env.VITE_ORACLE_FEE_BPS) || 500,
    positionBonusShareBps: Number(import.meta.env.VITE_POSITION_BONUS_SHARE_BPS) || 5000,
    targetPrimaryShareBps: Number(import.meta.env.VITE_TARGET_PRIMARY_SHARE_BPS) || 6000,
    maxCrossSubsidyBps: Number(import.meta.env.VITE_MAX_CROSS_SUBSIDY_BPS) || 1500,
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
    endTime: 0,
    transactionId: "",
    address: "",
    chainId: chainId ?? 0,
    tournamentId: currentTournament?.id ?? "",
    settings: buildContestSettings(
      chainId ?? 0,
      platformTokenAddress || "",
      platformTokenSymbol ?? ""
    ),
    description: undefined,
    userGroupId: undefined,
  }));

  const [expiryDaysAfterTournament, setExpiryDaysAfterTournament] = useState(
    defaultExpiryDaysAfterTournament
  );
  const [pendingContestData, setPendingContestData] = useState<CreateContestInput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      name: "",
      endTime: 0,
      transactionId: "",
      address: "",
      chainId: chainId ?? 0,
      tournamentId: currentTournament?.id ?? "",
      settings: buildContestSettings(
        chainId ?? 0,
        platformTokenAddress || "",
        platformTokenSymbol ?? ""
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
    onSuccess: async (statusData) => {
      if (!pendingContestData) return;

      setLoading(true);
      try {
        let contestAddress: string | undefined;
        const contestFactoryAddress = getContractAddress(chainId ?? 0, "contestFactoryAddress");

        if (statusData.receipts && statusData.receipts.length > 0) {
          for (const receipt of statusData.receipts) {
            if (receipt.logs && receipt.logs.length > 0) {
              for (const log of receipt.logs) {
                if (log.address?.toLowerCase() === contestFactoryAddress?.toLowerCase()) {
                  try {
                    const decodedLog = decodeEventLog({
                      abi: ContestFactoryContract.abi,
                      data: log.data,
                      topics: log.topics,
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
            transactionId: statusData.receipts?.[0]?.transactionHash || "",
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
          }
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

    const tournamentEndMs = new Date(currentTournament?.endDate ?? "").getTime();
    if (Number.isNaN(tournamentEndMs)) {
      setError("No valid tournament end date; cannot set contest expiry.");
      return;
    }

    const endTime = tournamentEndMs + expiryDaysAfterTournament * 24 * 60 * 60 * 1000;

    const paymentToken = platformTokenAddress || "";
    if (!paymentToken) {
      setError("Payment token is not configured.");
      return;
    }

    const pending: CreateContestInput = {
      ...formData,
      endTime,
      tournamentId: currentTournament?.id ?? "",
      chainId: chainId ?? 0,
      userGroupId: formData.userGroupId || undefined,
      settings: {
        ...s,
        paymentTokenAddress: paymentToken,
        paymentTokenSymbol: platformTokenSymbol ?? "",
        oracle,
        chainId: chainId ?? 0,
      },
    };

    setPendingContestData(pending);

    const primaryDepositAmount = BigInt(Math.floor(s.primaryDeposit * 1e18));
    const calls = createContestCalls(
      paymentToken,
      oracle,
      primaryDepositAmount,
      s.oracleFeeBps,
      BigInt(Math.floor(endTime / 1000)),
      s.positionBonusShareBps,
      s.targetPrimaryShareBps,
      s.maxCrossSubsidyBps
    );

    await execute(calls);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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
                    expiryDaysAfterTournament * 24 * 60 * 60 * 1000
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

        <div className="space-y-2">
          <span className="block font-medium">Payment token</span>
          <div className="p-2 bg-gray-100 rounded-md font-mono text-xs break-all">
            {platformTokenAddress || "Not configured"}
          </div>
          <p className="text-sm text-gray-600">{platformTokenSymbol}</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="oracle" className="block font-medium">
            Oracle
          </label>
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
          <label htmlFor="oracleFeeBps" className="block font-medium">
            Oracle fee BPS (0–1000)
          </label>
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
