import React from "react";
import { useBalance, useReadContract } from "wagmi";
import { createExplorerLinkJSX, getContractAddress } from "../../utils/blockchainUtils";
import type { Contest, DetailedResult } from "../../types/contest";
import ContestContract from "../../utils/contracts/Contest.json";
import { PositionBadge } from "./PositionBadge";

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

  const platformTokenAddress = getContractAddress(chainId ?? 0, "platformTokenAddress") ?? "";

  // Get platformToken balance for symbol
  const { data: platformToken } = useBalance({
    address: platformTokenAddress as `0x${string}`,
    token: platformTokenAddress as `0x${string}`,
  });

  // Get primary deposit amount from contract
  const primaryDepositAmount = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "primaryDepositAmount",
    args: [],
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  // Get expiry timestamp from contract
  const expiryTimestamp = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "expiryTimestamp",
    args: [],
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  // Get contract state
  const contractState = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "state",
    args: [],
    query: {
      enabled: !!contest?.address,
    },
  }).data as number | undefined;

  // Get oracle fee from contract
  const contractOracleFee = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "oracleFeeBps",
    args: [],
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  // Get oracle address from contract
  const oracleAddress = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
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

  // Layer 1: Primary Pool Data
  const primaryPrizePool = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "primaryPrizePool",
    args: [],
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  const primaryPrizePoolSubsidy = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "primaryPrizePoolSubsidy",
    args: [],
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  const totalPrimaryPositionSubsidies = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "totalPrimaryPositionSubsidies",
    args: [],
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  const primarySideBalance = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "getPrimarySideBalance",
    args: [],
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  // Layer 2: Secondary/Prediction Market Data
  const secondaryPrizePool = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "secondaryPrizePool",
    args: [],
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  // Configuration Parameters
  // const positionBonusShareBps = useReadContract({
  //   address: contest?.address as `0x${string}`,
  //   abi: ContestContract.abi,
  //   functionName: "positionBonusShareBps",
  //   args: [],
  //   query: {
  //     enabled: !!contest?.address,
  //   },
  // }).data as bigint | undefined;

  const targetPrimaryShareBps = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "targetPrimaryShareBps",
    args: [],
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  // const maxCrossSubsidyBps = useReadContract({
  //   address: contest?.address as `0x${string}`,
  //   abi: ContestContract.abi,
  //   functionName: "maxCrossSubsidyBps",
  //   args: [],
  //   query: {
  //     enabled: !!contest?.address,
  //   },
  // }).data as bigint | undefined;

  const currentPrimaryShareBps = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "getPrimarySideShareBps",
    args: [],
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  // const accumulatedOracleFee = useReadContract({
  //   address: contest?.address as `0x${string}`,
  //   abi: ContestContract.abi,
  //   functionName: "accumulatedOracleFee",
  //   args: [],
  //   query: {
  //     enabled: !!contest?.address,
  //   },
  // }).data as bigint | undefined;

  // Map contract state number to readable string
  const getStatusLabel = (state: number | undefined) => {
    if (state === undefined) return "Unknown";
    const statusMap: { [key: number]: string } = {
      0: "Open",
      1: "Active",
      2: "Locked",
      3: "Settled",
      4: "Cancelled",
      5: "Closed",
    };
    return statusMap[state] || "Unknown";
  };

  const getStatusColor = (state: number | undefined) => {
    if (state === undefined) return "text-gray-600";
    const colorMap: { [key: number]: string } = {
      0: "text-green-700 font-semibold", // Open
      1: "text-blue-700 font-semibold", // Active
      2: "text-yellow-700 font-semibold", // Locked
      3: "text-emerald-700 font-semibold", // Settled
      4: "text-red-700 font-semibold", // Cancelled
      5: "text-gray-700 font-semibold", // Closed
    };
    return colorMap[state] || "text-gray-600";
  };

  return (
    <div className="flex flex-col gap-4 p-4">
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
        <div>
          <h3 className="text-sm font-medium text-gray-900">Results</h3>
          {contest.results?.detailedResults ? (
            <div className="space-y-2 mt-2">
              {contest.results.detailedResults
                .filter((result: DetailedResult) => result.payoutBasisPoints > 0)
                .map((result: DetailedResult, index: number) => {
                  return (
                    <div
                      key={`${result.username}-${index}`}
                      className="bg-green-50 rounded-sm p-3 border border-green-400"
                    >
                      <div className="flex items-center justify-between gap-3">
                        {/* Left - Position */}
                        <PositionBadge
                          position={result.position}
                          isInTheMoney={true}
                          isUser={true}
                        />

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
                          {/* Payout */}
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-700 leading-none">
                              {/* Calculate payout amount */}
                              {(() => {
                                if (!primaryDepositAmount || !contractOracleFee || !platformToken)
                                  return "...";

                                // Calculate total pot from entry fee * number of participants
                                const entryFee = Number(primaryDepositAmount);
                                const participantCount = contest.contestLineups?.length || 0;
                                const totalPot = entryFee * participantCount;

                                // Calculate oracle fee amount
                                const oracleFeeAmount =
                                  (totalPot * Number(contractOracleFee)) / 10000;

                                // Net pot after oracle fee
                                const netPot = totalPot - oracleFeeAmount;

                                // Calculate payout for this position
                                const payoutAmount = (netPot * result.payoutBasisPoints) / 10000;

                                // Convert to display value
                                const displayValue =
                                  payoutAmount / Math.pow(10, platformToken.decimals);

                                return `$${displayValue.toFixed(2)}`;
                              })()}
                            </div>
                            <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
                              {result.payoutBasisPoints / 100}%
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
        </div>
      )}

      {/* Contest Contract Details */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">Contest Escrow Contract</h3>

        {/* Contract panel */}
        <div className="bg-gray-100 border-2 border-gray-300 shadow-inner p-3 min-h-[160px] mb-2">
          <div className="flex flex-col gap-1.5 font-mono text-xs">
            {/* Contract Balance */}
            {contractBalance !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Contract Balance:</span>
                <span className="text-gray-900 font-semibold">
                  {Number(contractBalance.value) / Math.pow(10, contractBalance.decimals)}{" "}
                  {contractBalance.symbol}
                </span>
              </div>
            )}

            {/* Primary Side Balance (Total) */}
            {primarySideBalance !== undefined && platformToken && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Contest Prize Pool:</span>
                <span className="text-gray-900 font-semibold">
                  {Number(primarySideBalance) / Math.pow(10, platformToken.decimals)}{" "}
                  {platformToken.symbol}
                </span>
              </div>
            )}

            {/* Primary Prize Pool (Base) */}
            {primaryPrizePool !== undefined && platformToken && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600 pl-4">↳ Base Prize Pool:</span>
                <span className="text-gray-900">
                  {Number(primaryPrizePool) / Math.pow(10, platformToken.decimals)}{" "}
                  {platformToken.symbol}
                </span>
              </div>
            )}

            {/* Primary Prize Pool Subsidy */}
            {primaryPrizePoolSubsidy !== undefined && platformToken && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600 pl-4">↳ Prize Pool Subsidy:</span>
                <span className="text-gray-900">
                  {Number(primaryPrizePoolSubsidy) / Math.pow(10, platformToken.decimals)}{" "}
                  {platformToken.symbol}
                </span>
              </div>
            )}

            {/* Total Primary Position Subsidies */}
            {totalPrimaryPositionSubsidies !== undefined && platformToken && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600 pl-4">↳ Position Subsidies:</span>
                <span className="text-gray-900">
                  {Number(totalPrimaryPositionSubsidies) / Math.pow(10, platformToken.decimals)}{" "}
                  {platformToken.symbol}
                </span>
              </div>
            )}

            {/* Secondary Prize Pool */}
            {secondaryPrizePool !== undefined && platformToken && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Prediction Prize Pool:</span>
                <span className="text-gray-900 font-semibold">
                  {Number(secondaryPrizePool) / Math.pow(10, platformToken.decimals)}{" "}
                  {platformToken.symbol}
                </span>
              </div>
            )}

            <hr className="my-2" />

            {/* Current Ratio - Visual Slider */}
            {currentPrimaryShareBps !== undefined && targetPrimaryShareBps !== undefined && (
              <div className="flex flex-col gap-1">
                <span className="text-gray-600 mb-2">Rebalancing Ratio:</span>

                {/* Slider Container */}
                <div className="relative h-8 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg border border-gray-300">
                  {/* Target Indicator Line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-10"
                    style={{ left: `${Number(targetPrimaryShareBps) / 100}%` }}
                  >
                    {/* <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-400 rounded-full border-2 border-white" /> */}
                    {/* <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-gray-700 font-semibold">
                      Target
                    </div> */}
                  </div>

                  {/* Current Position Indicator */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-green-500 z-20 rounded-sm"
                    style={{ left: `${Number(currentPrimaryShareBps) / 100}%` }}
                  >
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-md" />
                    {/* <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-green-700 font-semibold bg-white px-1 rounded border border-green-300">
                      Current: {(Number(currentPrimaryShareBps) / 100).toFixed(1)}%
                    </div> */}
                  </div>

                  {/* Labels at the ends */}
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-blue-700 font-semibold">
                    Contest
                  </div>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-purple-700 font-semibold">
                    Prediction
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-between text-[10px] text-gray-500 mt-2">
                  <span>0%</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      <span>Target</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span>Current</span>
                    </div>
                  </div>
                  <span>100%</span>
                </div>
              </div>
            )}

            {/* Position Bonus Share */}
            {/* {positionBonusShareBps !== undefined && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Position Bonus Share:</span>
                  <span className="text-gray-900">{Number(positionBonusShareBps) / 100}%</span>
                </div>
                <div className="text-xs text-gray-500 pl-0">
                  Allocated directly to entry owners from secondary deposits
                </div>
              </div>
            )} */}

            {/* Target Ratio */}
            {/* {targetPrimaryShareBps !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Target Ratio:</span>
                <span className="text-gray-900">
                  {(Number(targetPrimaryShareBps) / 100).toFixed(2)}% /{" "}
                  {(100 - Number(targetPrimaryShareBps) / 100).toFixed(2)}%
                </span>
              </div>
            )} */}

            {/* Max Cross Subsidy BPS */}
            {/* {maxCrossSubsidyBps !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Max Cross-Subsidy:</span>
                <span className="text-gray-900">{Number(maxCrossSubsidyBps) / 100}%</span>
              </div>
            )} */}

            <hr className="my-2" />

            {/* Contract Status */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Contract State:</span>
              <span className={`${getStatusColor(contractState)}`}>
                {getStatusLabel(contractState)}
              </span>
            </div>

            {/* Oracle Address */}
            {oracleAddress && chainId && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Oracle:</span>
                {createExplorerLinkJSX(
                  oracleAddress,
                  chainId,
                  `${oracleAddress?.slice(0, 6)}...${oracleAddress?.slice(-4)}`,
                  "text-blue-600 hover:text-blue-800 underline"
                )}
              </div>
            )}

            {/* Oracle Fee */}
            {contractOracleFee !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Oracle Fee:</span>
                <span className="text-gray-900">{Number(contractOracleFee) / 100}%</span>
              </div>
            )}

            {/* Accumulated Oracle Fee */}
            {/* {accumulatedOracleFee !== undefined && platformToken && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600 pl-4">↳ Accumulated:</span>
                <span className="text-gray-900">
                  {Number(accumulatedOracleFee) / Math.pow(10, platformToken.decimals)}{" "}
                  {platformToken.symbol}
                </span>
              </div>
            )} */}

            {/* Expiration */}
            {expiryTimestamp && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Contract Expires:</span>
                <span className="text-gray-900">
                  {new Date(Number(expiryTimestamp) * 1000).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Escrow Contract */}
        {contest?.address && chainId && (
          <div className="flex items-center gap-2 font-display text-sm">
            {/* <span className="text-gray-600">Contract:</span> */}
            {createExplorerLinkJSX(
              contest.address,
              chainId,
              "View Contract on Explorer →",
              "text-blue-600 hover:text-blue-800 underline"
            )}
          </div>
        )}
      </div>
    </div>
  );
};
