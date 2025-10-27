import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useChainId } from "wagmi";
import { decodeEventLog } from "viem";

import { useTournament } from "../../contexts/TournamentContext";
import { type CreateContestInput } from "../../types/contest";
import { useCreateContest as useCreateContestMutation } from "../../hooks/useContestMutations";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useCreateContest } from "../../hooks/useContestFactory";
import ContestFactoryContract from "../../utils/contracts/ContestFactory.json";
import { usePortoAuth } from "../../contexts/PortoAuthContext";

import { getContractAddress } from "../../utils/blockchainUtils.tsx";

// Helper function to get status messages
const getStatusMessages = (
  defaultMessage: string = "idle",
  isUserWaiting: boolean = false,
  isBlockchainWaiting: boolean = false
): string => {
  if (isUserWaiting) {
    return "User confirmation...";
  }

  if (isBlockchainWaiting) {
    return "Network confirmation...";
  }

  return defaultMessage;
};

export const CreateContestForm = () => {
  const navigate = useNavigate();
  const { currentTournament } = useTournament();
  const createContestMutation = useCreateContestMutation();
  const { platformTokenSymbol, platformTokenAddress } = usePortoAuth();

  // wagmi functions
  // const { address: userAddress} = useAccount();
  const chainId = useChainId();

  // Use Contest creation hook
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
        // Extract contest address from transaction logs
        let contestAddress: string | undefined;

        // Get the contest factory address to find relevant logs
        const contestFactoryAddress = getContractAddress(chainId ?? 0, "contestFactoryAddress");

        // Parse through receipts and logs to find ContestCreated event
        if (statusData.receipts && statusData.receipts.length > 0) {
          for (const receipt of statusData.receipts) {
            if (receipt.logs && receipt.logs.length > 0) {
              for (const log of receipt.logs) {
                // Check if this log is from the ContestFactory
                if (log.address?.toLowerCase() === contestFactoryAddress?.toLowerCase()) {
                  try {
                    const decodedLog = decodeEventLog({
                      abi: ContestFactoryContract.abi,
                      data: log.data,
                      topics: log.topics,
                    });

                    // Check if this is the ContestCreated event
                    if (
                      decodedLog.eventName === "ContestCreated" &&
                      decodedLog.args &&
                      typeof decodedLog.args === "object" &&
                      "contest" in decodedLog.args
                    ) {
                      contestAddress = decodedLog.args.contest as string;
                      console.log("Found contest address:", contestAddress);
                      break;
                    }
                  } catch (decodeError) {
                    // Skip logs that don't match the ABI
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

        // Create contest in backend using mutation
        createContestMutation.mutate(
          {
            ...pendingContestData,
            transactionId: statusData.receipts?.[0]?.transactionHash || "",
            address: contestAddress,
          },
          {
            onSuccess: (contest) => {
              // Reset form after successful submission
              setFormData(defaultFormData);
              setPendingContestData(null);
              setLoading(false);

              // Redirect to contest page
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

  // Form management
  const defaultFormData: CreateContestInput = {
    name: "",
    endTime: 0,
    transactionId: "",
    address: "",
    chainId: chainId ?? 0,
    tournamentId: currentTournament?.id ?? "",
    settings: {
      fee: 10,
      contestType: "PUBLIC",
      chainId: chainId ?? 0,
      platformTokenAddress: platformTokenAddress as `0x${string}`,
      platformTokenSymbol: platformTokenSymbol ?? "",
      oracleFee: 500, // Default 5% oracle fee (500 basis points)
    },
    description: undefined,
    userGroupId: undefined,
  };
  const [formData, setFormData] = useState<CreateContestInput>(defaultFormData);
  const [pendingContestData, setPendingContestData] = useState<CreateContestInput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get parameters from environment variables
  const oracleFee = Number(import.meta.env.VITE_ORACLE_FEE_BPS) || 500;
  // liquidityParameter controls LMSR price sensitivity
  // Recommended: 10-50 CUT = 2.5e18 | 50-100 CUT = 5e18 | 100-500 CUT = 2.5e19 | 500+ CUT = 5e19
  const liquidityParameter = import.meta.env.VITE_LIQUIDITY_PARAMETER || "5000000000000000000";
  const demandSensitivity = Number(import.meta.env.VITE_DEMAND_SENSITIVITY_BPS) || 100;
  const prizeShareBps = Number(import.meta.env.VITE_PRIZE_SHARE_BPS) || 750; // 7.5% default
  const userShareBps = Number(import.meta.env.VITE_USER_SHARE_BPS) || 750; // 7.5% default

  // Effect to handle pending contest data state
  useEffect(() => {
    if (pendingContestData && isConfirmed) {
      // The onSuccess callback in useCreateContest will handle the rest
      setPendingContestData(null);
    }
  }, [pendingContestData, isConfirmed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Get tournament endTime, add 7 days
    const endTime = new Date(currentTournament?.endDate ?? "").getTime() + 7 * 24 * 60 * 60 * 1000;

    // Store the form data for later use in the API call
    setPendingContestData({
      ...formData,
      endTime,
      tournamentId: currentTournament?.id ?? "", // Ensure tournamentId is preserved
      chainId: chainId ?? 0, // Ensure chainId is preserved
    });

    console.log("Initiating blockchain transaction with data:", {
      name: formData.name,
      depositAmount: formData.settings?.fee?.toString() ?? "0",
      endTime,
      oracle: import.meta.env.VITE_ORACLE_ADDRESS,
      oracleFee,
      liquidityParameter,
      demandSensitivity,
      prizeShareBps,
      userShareBps,
    });

    // Create and execute the contest creation calls
    // Convert fee to bigint with 18 decimals (platform token)
    const depositAmount = BigInt(Math.floor((formData.settings?.fee ?? 10) * 1e18));
    const calls = createContestCalls(
      platformTokenAddress as string, // paymentToken
      import.meta.env.VITE_ORACLE_ADDRESS as string, // oracle
      depositAmount, // contestantDepositAmount
      oracleFee, // oracleFee in bps
      BigInt(Math.floor(endTime / 1000)), // expiry timestamp (seconds)
      BigInt(liquidityParameter), // liquidityParameter
      demandSensitivity, // demandSensitivity in bps
      prizeShareBps, // prizeShareBps
      userShareBps // userShareBps
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto p-4">
      {/* Editable Section */}
      <div className="space-y-4 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
        <h3 className="text-lg font-semibold text-blue-900">Editable Parameters</h3>

        <div className="space-y-2">
          <label htmlFor="name" className="block font-medium">
            Contest Name
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
          <label htmlFor="settings.fee" className="block font-medium">
            Entry Fee (Contestant Deposit Amount)
          </label>
          <div className="relative">
            <input
              type="number"
              id="settings.fee"
              name="settings.fee"
              value={formData.settings?.fee ?? 0}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  settings: {
                    ...prev.settings,
                    fee: Number(e.target.value),
                    contestType: prev.settings?.contestType ?? "PUBLIC",
                    platformTokenAddress: prev.settings?.platformTokenAddress ?? "",
                    platformTokenSymbol: prev.settings?.platformTokenSymbol ?? "",
                    chainId: prev.settings?.chainId ?? 0,
                  },
                }));
              }}
              min="0"
              step="0.01"
              required
              className="w-full p-2 border rounded-md pr-12"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
              {platformTokenSymbol}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block font-medium">Contest Expiry</label>
          <div className="p-2 bg-white border rounded-md text-sm">
            {currentTournament?.endDate
              ? new Date(
                  new Date(currentTournament.endDate).getTime() + 7 * 24 * 60 * 60 * 1000
                ).toLocaleString()
              : "Tournament not selected"}
          </div>
          <div className="text-sm text-gray-600">
            Based on tournament end:{" "}
            {currentTournament?.endDate
              ? new Date(currentTournament.endDate).toLocaleString()
              : "Not available"}{" "}
            + 7 days
          </div>
        </div>
      </div>

      {/* Read-Only Parameters Section */}
      <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">Contract Parameters (Read-Only)</h3>

        <div className="space-y-2">
          <label className="block font-medium">Payment Token Address</label>
          <div className="p-2 bg-gray-100 rounded-md font-mono text-xs break-all">
            {platformTokenAddress || "Not configured"}
          </div>
          <div className="text-sm text-gray-600">Symbol: {platformTokenSymbol}</div>
        </div>

        <div className="space-y-2">
          <label className="block font-medium">Oracle Address</label>
          <div className="p-2 bg-gray-100 rounded-md font-mono text-xs break-all">
            {import.meta.env.VITE_ORACLE_ADDRESS || "Not configured"}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block font-medium">Oracle Fee</label>
          <div className="p-2 bg-gray-100 rounded-md">
            {oracleFee} basis points ({(oracleFee / 100).toFixed(2)}%)
          </div>
        </div>

        <div className="space-y-2">
          <label className="block font-medium">Liquidity Parameter</label>
          <div className="p-2 bg-gray-100 rounded-md font-mono text-xs">{liquidityParameter}</div>
          <div className="text-xs text-gray-500">
            Controls LMSR price sensitivity (higher = more stable prices)
          </div>
        </div>

        <div className="space-y-2">
          <label className="block font-medium">Demand Sensitivity</label>
          <div className="p-2 bg-gray-100 rounded-md">
            {demandSensitivity} basis points ({(demandSensitivity / 100).toFixed(2)}%)
          </div>
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

      {/* Add status display */}
      <div className="mt-2 text-sm text-center text-red-500">
        {/* Transaction error */}
        {(transactionError || isFailed) && (
          <div>
            {transactionError ||
              "The transaction was rejected or failed to execute. Please try again."}
          </div>
        )}

        {/* Server error */}
        {error && <div>Server Error: {error}</div>}
      </div>
    </form>
  );
};
