import React from "react";
import { useBalance, useChains, useReadContract } from "wagmi";
import { createExplorerLinkJSX, getContractAddress } from "../../utils/blockchainUtils";
import type { Contest, DetailedResult } from "../../types/contest";
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

  // Get contract balance
  const { data: contractBalance } = useBalance({
    address: contest?.address as `0x${string}`,
    token: platformTokenAddress as `0x${string}`,
    query: {
      enabled: !!contest?.address && !!platformTokenAddress,
    },
  });

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
      {/* Payout Distribution - Only show when NOT settled */}
      {contest?.contestLineups && contest.status !== "SETTLED" && (
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
                          <span className="text-gray-700 font-display">
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

      {/* Settlement Details - Only show when SETTLED */}
      {contest.status === "SETTLED" && (
        <>
          <h3 className="text-sm font-medium text-gray-900">Results</h3>
          {contest.results?.detailedResults ? (
            <div className="space-y-2 mt-2">
              {contest.results.detailedResults
                .filter((result: DetailedResult) => result.payoutBasisPoints > 0)
                .map((result: DetailedResult, index: number) => {
                  return (
                    <div
                      key={`${result.username}-${index}`}
                      className="bg-green-50 rounded-sm p-3 border border-gray-200"
                    >
                      <div className="flex items-center justify-between gap-3">
                        {/* Left - Position */}
                        <div className="flex-shrink-0 w-8">
                          <div className="text-lg font-bold text-gray-900">{result.position}</div>
                        </div>

                        {/* Middle - User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate leading-tight">
                            {result.username}
                          </div>
                          <div className="text-xs text-gray-500 truncate leading-tight mt-0.5">
                            {result.lineupName}
                          </div>
                        </div>

                        {/* Right - Score & Payout */}
                        <div className="flex-shrink-0 flex items-center gap-4">
                          {/* Score */}
                          {/* <div className="text-right">
                            <div className="text-lg font-bold text-gray-900 leading-none">
                              {result.score}
                            </div>
                            <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
                              PTS
                            </div>
                          </div> */}

                          {/* Payout */}
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600 leading-none">
                              {(result.payoutBasisPoints / 100).toFixed(1)}%
                            </div>
                            <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
                              PAYOUT
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="bg-gray-100 border-2 border-gray-300 shadow-inner p-3 min-h-[100px] flex items-center justify-center">
              <p className="text-gray-500 text-sm">No settlement results available</p>
            </div>
          )}
        </>
      )}

      {/* Contest Settings */}
      <h3 className="text-sm font-medium text-gray-900 mt-4">Escrow Contract</h3>

      {/* Contract details */}
      <div className="bg-gray-100 border-2 border-gray-300 shadow-inner p-3 min-h-[220px]">
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

          {/* Contract Balance */}
          {contractBalance !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Contract Balance:</span>
              <span className="text-gray-900">
                {Number(contractBalance.value) / Math.pow(10, contractBalance.decimals)}{" "}
                {contractBalance.symbol}
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
