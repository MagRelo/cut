import { useState, useEffect } from "react";
import { decodeEventLog, parseUnits } from "viem";
import { useNavigate } from "react-router-dom";
import { useBalance, useAccount, useSendCalls, useWaitForCallsStatus, useChainId } from "wagmi";

import { useTournament } from "../../contexts/TournamentContext";
import { type CreateContestInput } from "../../types/contest";
import { useContestApi } from "../../services/contestApi";
import { LoadingSpinnerSmall } from "../common/LoadingSpinnerSmall";

// contracts
import EscrowFactory from "../../utils/contracts/EscrowFactory.json";
import { getContractAddress } from "../../utils/blockchainUtils.tsx";

// Helper function to get status messages
const getStatusMessages = (
  defaultMessage: string = "idle",
  isUserWaiting: boolean = false,
  isBlockchainWaiting: boolean = false
): string => {
  if (isUserWaiting) {
    return "Waiting for User...";
  }

  if (isBlockchainWaiting) {
    return "Waiting for Blockchain...";
  }

  return defaultMessage;
};

export const CreateContestForm = () => {
  const navigate = useNavigate();
  const { currentTournament } = useTournament();
  const contestApi = useContestApi();

  // wagmi functions
  const { address: userAddress } = useAccount();
  const chainId = useChainId();

  // Get contract addresses dynamically
  const escrowFactoryAddress = getContractAddress(chainId ?? 0, "escrowFactoryAddress");
  const platformTokenAddress = getContractAddress(chainId ?? 0, "platformTokenAddress");
  const {
    sendCalls,
    data: sendCallsData,
    isPending: isSending,
    error: sendCallsError,
  } = useSendCalls();
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmationError,
    data: confirmationData,
  } = useWaitForCallsStatus({
    id: sendCallsData?.id,
  });

  // get & set platform token
  const { data: platformTokenBalance } = useBalance({
    address: userAddress as `0x${string}`,
    token: platformTokenAddress as `0x${string}`,
    chainId: chainId ?? 0,
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
      platformTokenSymbol: platformTokenBalance?.symbol ?? "",
      oracleFee: 500, // Default 5% oracle fee (500 basis points)
    },
    description: undefined,
    userGroupId: undefined,
  };
  const [formData, setFormData] = useState<CreateContestInput>(defaultFormData);
  const [pendingContestData, setPendingContestData] = useState<CreateContestInput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effect to handle API call after blockchain confirmation
  useEffect(() => {
    const createContestInBackend = async () => {
      if (isConfirmed && pendingContestData && sendCallsData?.id) {
        setLoading(true);
        try {
          // Parse logs from the EscrowFactory address
          const escrowFactoryLogs = confirmationData?.receipts?.[0]?.logs?.filter(
            (log) => log.address.toLowerCase() === escrowFactoryAddress?.toLowerCase()
          );
          if (!escrowFactoryLogs?.length) {
            console.log("Confirmation data:", confirmationData);
            throw new Error("No logs found from EscrowFactory");
          }

          // Decode the logs using the ABI
          const decodedLogs = escrowFactoryLogs
            .map((log) => {
              try {
                const decoded = decodeEventLog({
                  abi: EscrowFactory.abi,
                  data: log.data,
                  topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
                });
                return decoded;
              } catch (error) {
                console.error("Error decoding log:", error);
                return null;
              }
            })
            .filter(Boolean);

          // Get the escrow address from the logs
          const escrowAddress = (decodedLogs[0]?.args as unknown as { escrow: string })?.escrow;
          if (!escrowAddress) {
            throw new Error("No escrow address found in logs");
          }

          // create contest in backend
          const contest = await contestApi.createContest({
            ...pendingContestData,
            transactionId: sendCallsData?.id,
            address: escrowAddress,
          });

          // Reset form after successful submission
          setFormData(defaultFormData);
          setPendingContestData(null);

          // redirect to contest page
          navigate(`/contest/${contest.id}`);
        } catch (err) {
          console.error("Error creating contest in backend:", err);
          setError("Failed to create contest in backend");
        } finally {
          setLoading(false);
        }
      }
    };

    createContestInBackend();
  }, [isConfirmed, pendingContestData, sendCallsData?.id, contestApi]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);

      // get tournament endTIme, add 7 days
      const endTime =
        new Date(currentTournament?.endDate ?? "").getTime() + 7 * 24 * 60 * 60 * 1000;

      // Store the form data for later use in the API call
      setPendingContestData({
        ...formData,
        endTime,
        tournamentId: currentTournament?.id ?? "", // Ensure tournamentId is preserved
        chainId: chainId ?? 0, // Ensure chainId is preserved
      });

      console.log("Initiating blockchain transaction with data:", {
        name: formData.name,
        depositAmount: parseUnits(
          formData.settings?.fee?.toString() ?? "0",
          18 // PlatformToken has 18 decimals
        ),
        endTime,
        paymentToken: platformTokenAddress,
        paymentTokenDecimals: 18,
        oracle: import.meta.env.VITE_ORACLE_ADDRESS,
        oracleFee: formData.settings?.oracleFee ?? 500,
        hasABI: !!EscrowFactory.abi,
      });

      // Execute blockchain transaction
      sendCalls({
        calls: [
          {
            abi: EscrowFactory.abi,
            args: [
              parseUnits(
                formData.settings?.fee?.toString() ?? "0",
                18 // PlatformToken has 18 decimals
              ),
              BigInt(endTime),
              platformTokenAddress as `0x${string}`,
              18, // PlatformToken has 18 decimals
              import.meta.env.VITE_ORACLE_ADDRESS as `0x${string}`,
              formData.settings?.oracleFee ?? 500,
            ],
            functionName: "createEscrow",
            to: escrowFactoryAddress as `0x${string}`,
          },
        ],
      });

      // console.log("Send calls result:", result);
    } catch (err) {
      console.error("Error initiating blockchain transaction:", err);
      setError("Failed to initiate blockchain transaction");
      setLoading(false);
      setPendingContestData(null);
    }
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
            {platformTokenBalance?.symbol}
          </div>
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
        <div className="text-sm text-gray-600">
          Oracle fee in basis points (100 = 1%). Default: 500 (5%)
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading || isSending || isConfirming}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed mt-2"
        >
          {loading || isSending || isConfirming ? (
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
        {/* Confirmation error */}
        {confirmationError && (
          <div>
            {(confirmationError as { shortMessage?: string; message: string }).shortMessage ||
              confirmationError.message}
          </div>
        )}

        {/* Send calls error */}
        {sendCallsError && (
          <div>
            {(sendCallsError as { shortMessage?: string; message: string }).shortMessage ||
              sendCallsError.message}
          </div>
        )}

        {/* Server error */}
        {error && <div>Server Error: {error}</div>}
      </div>
    </form>
  );
};
