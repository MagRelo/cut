import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useChainId } from "wagmi";
import { decodeEventLog } from "viem";

import { useTournament } from "../../contexts/TournamentContext";
import { type CreateContestInput } from "../../types/contest";
import { useCreateContest } from "../../hooks/useContestMutations";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";
import { useCreateEscrow } from "../../hooks/useEscrowOperations";
import EscrowFactoryContract from "../../utils/contracts/EscrowFactory.json";
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
  const createContestMutation = useCreateContest();
  const { platformTokenSymbol, platformTokenAddress } = usePortoAuth();

  // wagmi functions
  const { address: userAddress } = useAccount();
  const chainId = useChainId();

  // Use centralized create escrow hook
  const {
    execute,
    isProcessing,
    isSending,
    isConfirming,
    isConfirmed,
    isFailed,
    error: transactionError,
    createEscrowCalls,
  } = useCreateEscrow({
    onSuccess: async (statusData) => {
      if (!pendingContestData) return;

      setLoading(true);
      try {
        // Extract escrow address from transaction logs
        let escrowAddress: string | undefined;

        // Get the escrow factory address to find relevant logs
        const escrowFactoryAddress = getContractAddress(chainId ?? 0, "escrowFactoryAddress");

        // Parse through receipts and logs to find EscrowCreated event
        if (statusData.receipts && statusData.receipts.length > 0) {
          for (const receipt of statusData.receipts) {
            if (receipt.logs && receipt.logs.length > 0) {
              for (const log of receipt.logs) {
                // Check if this log is from the EscrowFactory
                if (log.address?.toLowerCase() === escrowFactoryAddress?.toLowerCase()) {
                  try {
                    const decodedLog = decodeEventLog({
                      abi: EscrowFactoryContract.abi,
                      data: log.data,
                      topics: log.topics,
                    });

                    // Check if this is the EscrowCreated event
                    if (
                      decodedLog.eventName === "EscrowCreated" &&
                      decodedLog.args &&
                      typeof decodedLog.args === "object" &&
                      "escrow" in decodedLog.args
                    ) {
                      escrowAddress = decodedLog.args.escrow as string;
                      console.log("Found escrow address:", escrowAddress);
                      break;
                    }
                  } catch (decodeError) {
                    // Skip logs that don't match the ABI
                    console.debug("Could not decode log, skipping:", decodeError);
                  }
                }
              }
            }
            if (escrowAddress) break;
          }
        }

        if (!escrowAddress) {
          throw new Error("No escrow address found in transaction logs");
        }

        // Create contest in backend using mutation
        createContestMutation.mutate(
          {
            ...pendingContestData,
            transactionId: statusData.receipts?.[0]?.transactionHash || "",
            address: escrowAddress,
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

  // Effect to handle pending contest data state
  useEffect(() => {
    if (pendingContestData && isConfirmed) {
      // The onSuccess callback in useCreateEscrow will handle the rest
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
      oracleFee: formData.settings?.oracleFee ?? 500,
    });

    // Create and execute the escrow creation calls
    // Convert fee to bigint with 18 decimals (platform token)
    const depositAmount = BigInt(Math.floor((formData.settings?.fee ?? 10) * 1e18));
    const calls = createEscrowCalls(
      depositAmount,
      BigInt(Math.floor(endTime / 1000)), // Convert milliseconds to seconds for Solidity
      platformTokenAddress as string,
      18, // Platform token decimals
      import.meta.env.VITE_ORACLE_ADDRESS as string,
      formData.settings?.oracleFee ?? 500
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
    <form onSubmit={handleSubmit} className="space-y-2 max-w-2xl mx-auto p-4">
      <div className="space-y-2">
        <label className="block font-medium">
          Contest End (
          {currentTournament?.endDate
            ? new Date(currentTournament.endDate).toLocaleString()
            : "Not available"}
          )
        </label>
        <div className="p-2 bg-gray-100 rounded-md text-sm">
          {currentTournament?.endDate
            ? new Date(
                new Date(currentTournament.endDate).getTime() + 7 * 24 * 60 * 60 * 1000
              ).toLocaleString()
            : "Tournament not selected"}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block font-medium">Oracle Address</label>
        <div className="p-2 bg-gray-100 rounded-md font-mono text-xs break-all">
          {import.meta.env.VITE_ORACLE_ADDRESS || "Not configured"}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="settings.oracleFee" className="block font-medium">
          Oracle Fee (basis points)
        </label>
        <div className="relative">
          <input
            type="number"
            id="settings.oracleFee"
            name="settings.oracleFee"
            value={formData.settings?.oracleFee ?? 500}
            onChange={(e) => {
              setFormData((prev) => ({
                ...prev,
                settings: {
                  fee: prev.settings?.fee ?? 0,
                  contestType: prev.settings?.contestType ?? "PUBLIC",
                  platformTokenAddress: prev.settings?.platformTokenAddress ?? "",
                  platformTokenSymbol: prev.settings?.platformTokenSymbol ?? "",
                  chainId: prev.settings?.chainId ?? 0,
                  oracleFee: Number(e.target.value),
                },
              }));
            }}
            min="0"
            max="10000"
            step="1"
            required
            className="w-full p-2 border rounded-md pr-12"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
            bp
          </div>
        </div>
        <div className="text-sm text-gray-600">Oracle fee in basis points (100 = 1%)</div>
      </div>

      <div className="space-y-2">
        <label htmlFor="settings.fee" className="block font-medium">
          Entry Fee
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
                  fee: Number(e.target.value),
                  contestType: prev.settings?.contestType ?? "PUBLIC",
                  platformTokenAddress: prev.settings?.platformTokenAddress ?? "",
                  platformTokenSymbol: prev.settings?.platformTokenSymbol ?? "",
                  chainId: prev.settings?.chainId ?? 0,
                  oracleFee: prev.settings?.oracleFee ?? 500,
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
