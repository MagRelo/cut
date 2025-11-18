import React from "react";
import { useBalance, useReadContract } from "wagmi";
import { erc20Abi, formatUnits } from "viem";
import { createExplorerLinkJSX } from "../../utils/blockchainUtils";
import type { Contest } from "../../types/contest";
import ContestContract from "../../utils/contracts/Contest.json";

interface ContestSettingsProps {
  contest: Contest;
}

export const ContestSettings: React.FC<ContestSettingsProps> = ({ contest }) => {
  // Use the contest's stored chainId
  const chainId = contest?.chainId as 8453 | 84532 | undefined;

  const paymentTokenOnChain = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "paymentToken",
    args: [],
    chainId,
    query: {
      enabled: !!contest?.address,
    },
  }).data as `0x${string}` | undefined;

  const fallbackPaymentTokenAddress = contest?.settings?.platformTokenAddress as
    | `0x${string}`
    | undefined;

  const paymentTokenAddress = paymentTokenOnChain ?? fallbackPaymentTokenAddress;

  const paymentTokenSymbol = useReadContract({
    address: paymentTokenAddress as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "symbol",
    args: [],
    chainId,
    query: {
      enabled: !!paymentTokenAddress,
    },
  }).data as string | undefined;

  const paymentTokenDecimals = useReadContract({
    address: paymentTokenAddress as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "decimals",
    args: [],
    chainId,
    query: {
      enabled: !!paymentTokenAddress,
    },
  }).data as number | undefined;

  const { data: contractBalance } = useBalance({
    address: contest?.address as `0x${string}`,
    token: paymentTokenAddress as `0x${string}` | undefined,
    chainId,
    query: {
      enabled: !!contest?.address && !!paymentTokenAddress,
    },
  });

  // Get expiry timestamp from contract
  const expiryTimestamp = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "expiryTimestamp",
    args: [],
    chainId,
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
    chainId,
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
    chainId,
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
    chainId,
    query: {
      enabled: !!contest?.address,
    },
  }).data as `0x${string}` | undefined;

  // Layer 1: Primary Pool Data
  const primaryPrizePool = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "primaryPrizePool",
    args: [],
    chainId,
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  const primaryPrizePoolSubsidy = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "primaryPrizePoolSubsidy",
    args: [],
    chainId,
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  const totalPrimaryPositionSubsidies = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "totalPrimaryPositionSubsidies",
    args: [],
    chainId,
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  const primarySideBalance = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "getPrimarySideBalance",
    args: [],
    chainId,
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
    chainId,
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  const secondaryPrizePoolSubsidy = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "secondaryPrizePoolSubsidy",
    args: [],
    chainId,
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  const secondarySideBalance = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "getSecondarySideBalance",
    args: [],
    chainId,
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  const targetPrimaryShareBps = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "targetPrimaryShareBps",
    args: [],
    chainId,
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  const currentPrimaryShareBps = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "getPrimarySideShareBps",
    args: [],
    chainId,
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  const tokenDecimals = paymentTokenDecimals ?? contractBalance?.decimals ?? 18;
  const tokenSymbol =
    paymentTokenSymbol ?? contractBalance?.symbol ?? contest?.settings?.platformTokenSymbol ?? "";

  const formatTokenAmount = (
    value?: bigint,
    {
      fractionDigits = 2,
      decimals = tokenDecimals,
    }: { fractionDigits?: number; decimals?: number } = {}
  ) => {
    if (value === undefined) return "...";
    try {
      const normalized = formatUnits(value, decimals);
      const numeric = Number.parseFloat(normalized);
      if (Number.isNaN(numeric)) {
        return normalized;
      }
      return numeric.toLocaleString(undefined, { maximumFractionDigits: fractionDigits });
    } catch {
      return value.toString();
    }
  };

  const resolvedTokenSymbol = tokenSymbol || "TOKEN";

  const targetPrimarySharePercent =
    targetPrimaryShareBps !== undefined ? Number(targetPrimaryShareBps) / 100 : undefined;
  const currentPrimarySharePercent =
    currentPrimaryShareBps !== undefined ? Number(currentPrimaryShareBps) / 100 : undefined;

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
      {/* Contest Contract Details */}
      <div>
        {/* Contract panel */}
        <div className="bg-gray-100 border-2 border-gray-300 shadow-inner p-3 min-h-[160px] mb-2">
          <div className="flex flex-col gap-1.5 font-mono text-xs">
            {/* Contract Status */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Contract State:</span>
              <span className={`${getStatusColor(contractState)}`}>
                {getStatusLabel(contractState)}
              </span>
            </div>

            {/* Contract Balance */}
            {contractBalance?.value !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Contract Balance:</span>
                <span className="text-gray-900 font-semibold">
                  {formatTokenAmount(contractBalance.value, {
                    fractionDigits: 4,
                    decimals: contractBalance.decimals,
                  })}{" "}
                  {tokenSymbol || contractBalance.symbol || resolvedTokenSymbol}
                </span>
              </div>
            )}

            <hr className="my-2" />

            {/* Current Ratio - Visual Slider */}
            {currentPrimaryShareBps !== undefined && targetPrimaryShareBps !== undefined && (
              <div className="flex flex-col gap-1">
                <span className="text-gray-600 mb-2">Pool Rebalancing:</span>

                {/* Slider Container */}
                <div className="relative h-8 bg-gradient-to-r from-blue-100 to-emerald-100 rounded-lg border border-gray-300">
                  {/* Target Indicator Line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-10"
                    style={{ left: `${targetPrimarySharePercent ?? 0}%` }}
                  ></div>

                  {/* Current Position Indicator */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-green-500 z-20 rounded-sm"
                    style={{ left: `${currentPrimarySharePercent ?? 0}%` }}
                  >
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-md" />
                  </div>

                  {/* Labels at the ends */}
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-blue-700 font-semibold">
                    Contest
                  </div>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-700 font-semibold">
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

            <div className="mt-2" />

            {/* Primary Side Balance (Total) */}
            {primarySideBalance !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Contest Prize Pool:</span>
                <span className="text-gray-900 font-semibold">
                  {formatTokenAmount(primarySideBalance, { fractionDigits: 4 })}{" "}
                  {resolvedTokenSymbol}
                </span>
              </div>
            )}

            {/* Primary Prize Pool (Base) */}
            {primaryPrizePool !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600 pl-4">↳ Base Pool:</span>
                <span className="text-gray-900">
                  {formatTokenAmount(primaryPrizePool, { fractionDigits: 4 })} {resolvedTokenSymbol}
                </span>
              </div>
            )}

            {/* Primary Prize Pool Subsidy */}
            {primaryPrizePoolSubsidy !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600 pl-4">↳ Pool Subsidy:</span>
                <span className="text-gray-900">
                  {formatTokenAmount(primaryPrizePoolSubsidy, { fractionDigits: 4 })}{" "}
                  {resolvedTokenSymbol}
                </span>
              </div>
            )}

            {/* Secondary Side Balance */}
            {secondarySideBalance !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Prediction Prize Pool:</span>
                <span className="text-gray-900 font-semibold">
                  {formatTokenAmount(secondarySideBalance, { fractionDigits: 4 })}{" "}
                  {resolvedTokenSymbol}
                </span>
              </div>
            )}

            {/* Secondary Prize Pool */}
            {secondaryPrizePool !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600 pl-4">↳ Base Pool:</span>
                <span className="text-gray-900">
                  {formatTokenAmount(secondaryPrizePool, { fractionDigits: 4 })}{" "}
                  {resolvedTokenSymbol}
                </span>
              </div>
            )}

            {/* Secondary Prize Pool Subsidy */}
            {secondaryPrizePoolSubsidy !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600 pl-4">↳ Pool Subsidy:</span>
                <span className="text-gray-900">
                  {formatTokenAmount(secondaryPrizePoolSubsidy, { fractionDigits: 4 })}{" "}
                  {resolvedTokenSymbol}
                </span>
              </div>
            )}

            {/* Total Primary Position Subsidies */}
            {totalPrimaryPositionSubsidies !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Position Subsidies:</span>
                <span className="text-gray-900 font-semibold">
                  {formatTokenAmount(totalPrimaryPositionSubsidies, { fractionDigits: 4 })}{" "}
                  {resolvedTokenSymbol}
                </span>
              </div>
            )}

            <hr className="my-2" />

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
            {/* {accumulatedOracleFee !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600 pl-4">↳ Accumulated:</span>
                <span className="text-gray-900">
                  {formatTokenAmount(accumulatedOracleFee, { fractionDigits: 4 })}{" "}
                  {resolvedTokenSymbol}
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
