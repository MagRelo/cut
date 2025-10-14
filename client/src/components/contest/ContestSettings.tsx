import React from "react";
import { useBalance, useChains, useReadContract } from "wagmi";
import { createExplorerLinkJSX, getContractAddress } from "../../utils/blockchainUtils";
import type { Contest } from "../../types/contest";
import EscrowContract from "../../utils/contracts/Escrow.json";

interface ContestSettingsProps {
  contest: Contest;
}

// Function to get payout structure based on contest size
function getPayoutStructure(participantCount: number) {
  const isLargeContest = participantCount >= 10;

  if (isLargeContest) {
    return {
      "1": 7000, // 70% for winner
      "2": 2000, // 20% for second place
      "3": 1000, // 10% for third place
    };
  } else {
    return {
      "1": 10000, // 100% for winner (small contests)
    };
  }
}

export const ContestSettings: React.FC<ContestSettingsProps> = ({ contest }) => {
  // Use the contest's stored chainId
  const chainId = contest?.chainId;
  const chains = useChains();
  const chain = chains.find((c: { id: number }) => c.id === chainId);

  const platformTokenAddress = getContractAddress(chainId ?? 0, "platformTokenAddress") ?? "";

  // Get platformToken balance for symbol
  const { data: platformToken } = useBalance({
    address: platformTokenAddress as `0x${string}`,
    token: platformTokenAddress as `0x${string}`,
  });

  // Get escrow contract details (depositAmount and expiry)
  const escrowDetails = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: EscrowContract.abi,
    functionName: "details",
    args: [],
    query: {
      enabled: !!contest?.address,
    },
  }).data as [bigint, bigint] | undefined;

  // Get escrow contract state
  const contractState = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: EscrowContract.abi,
    functionName: "state",
    args: [],
    query: {
      enabled: !!contest?.address,
    },
  }).data as number | undefined;

  // Get oracle fee from contract
  const contractOracleFee = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: EscrowContract.abi,
    functionName: "oracleFee",
    args: [],
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  // Get participants count from contract
  const participantsCount = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: EscrowContract.abi,
    functionName: "getParticipantsCount",
    args: [],
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  // Get total deposits from contract
  const totalDeposits = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: EscrowContract.abi,
    functionName: "totalInitialDeposits",
    args: [],
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  // Get oracle address from contract
  const oracleAddress = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: EscrowContract.abi,
    functionName: "oracle",
    args: [],
    query: {
      enabled: !!contest?.address,
    },
  }).data as `0x${string}` | undefined;

  // Map contract state number to readable string
  const getStatusLabel = (state: number | undefined) => {
    if (state === undefined) return "Unknown";
    const statusMap: { [key: number]: string } = {
      0: "Open",
      1: "In Progress",
      2: "Settled",
      3: "Cancelled",
    };
    return statusMap[state] || "Unknown";
  };

  const getStatusColor = (state: number | undefined) => {
    if (state === undefined) return "text-gray-600";
    const colorMap: { [key: number]: string } = {
      0: "text-green-700 font-semibold", // Open
      1: "text-blue-700 font-semibold", // In Progress
      2: "text-emerald-700 font-semibold", // Settled
      3: "text-red-700 font-semibold", // Cancelled
    };
    return colorMap[state] || "text-gray-600";
  };

  return (
    <div className="flex flex-col gap-2 p-4">
      {/* Payout Structure */}
      {contest?.contestLineups && (
        <div className="">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Payout Distribution</h3>
          <div className="bg-gray-50 rounded-lg p-3">
            {(() => {
              const participantCount = contest.contestLineups.length;
              const payoutStructure = getPayoutStructure(participantCount);

              return (
                <div className="space-y-2">
                  <div className="space-y-1">
                    {Object.entries(payoutStructure).map(([position, percentage]) => {
                      return (
                        <div key={position} className="flex justify-between text-sm">
                          <span className="text-gray-700">
                            {position === "1"
                              ? "1st Place"
                              : position === "2"
                              ? "2nd Place"
                              : position === "3"
                              ? "3rd Place"
                              : `${position}th Place`}
                          </span>
                          <span className="font-medium text-emerald-600">{percentage / 100}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Contest Settings */}
      <h3 className="text-sm font-medium text-gray-900 mb-2 mt-4">Escrow Status</h3>
      <div className="bg-gray-100 border-2 border-gray-300 shadow-inner p-3">
        <div className="flex flex-col gap-1.5 font-mono text-xs">
          {/* Contract Status */}
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Contract State:</span>
            <span className={`${getStatusColor(contractState)}`}>
              {getStatusLabel(contractState)}
            </span>
          </div>

          {/* Deposit Amount */}
          {escrowDetails && escrowDetails[0] && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Deposit Amount:</span>
              <span className="text-gray-900">
                {Number(escrowDetails[0]) / Math.pow(10, platformToken?.decimals || 6)}{" "}
                {platformToken?.symbol}
              </span>
            </div>
          )}

          {/* Participants */}
          {participantsCount !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Participants:</span>
              <span className="text-gray-900">{Number(participantsCount)}</span>
            </div>
          )}

          {/* Total Deposits */}
          {totalDeposits !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Total Deposits:</span>
              <span className="text-gray-900">
                {Number(totalDeposits) / Math.pow(10, platformToken?.decimals || 6)}{" "}
                {platformToken?.symbol}
              </span>
            </div>
          )}

          {/* Oracle Fee */}
          {contractOracleFee !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Oracle Fee:</span>
              <span className="text-gray-900">{Number(contractOracleFee) / 100}%</span>
            </div>
          )}

          {/* Oracle Address */}
          {oracleAddress && chainId && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Oracle:</span>
              {createExplorerLinkJSX(
                oracleAddress,
                chainId,
                "View on Explorer",
                "text-blue-600 hover:text-blue-800 underline"
              )}
            </div>
          )}

          {/* Expiration */}
          {escrowDetails && escrowDetails[1] && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Expires:</span>
              <span className="text-gray-900">
                {new Date(Number(escrowDetails[1]) * 1000).toLocaleString()}
              </span>
            </div>
          )}

          {/* Chain Name */}
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Chain:</span>
            <span className="text-gray-900">{chain?.name}</span>
          </div>

          {/* Escrow Contract */}
          {contest?.address && chainId && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Contract:</span>
              {createExplorerLinkJSX(
                contest.address,
                chainId,
                "View on Explorer",
                "text-blue-600 hover:text-blue-800 underline"
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
