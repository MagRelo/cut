import React from "react";
import { useBalance, useReadContract } from "wagmi";
import { erc20Abi, formatUnits } from "viem";
import { createExplorerLinkJSX } from "../../utils/blockchainUtils";
import type { Contest } from "../../types/contest";
import ContestContract from "../../utils/contracts/ContestController.json";

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

  const fallbackPaymentTokenAddress = contest?.settings?.paymentTokenAddress as
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

  const totalSecondaryLiquidity = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "totalSecondaryLiquidity",
    args: [],
    chainId,
    query: {
      enabled: !!contest?.address,
    },
  }).data as bigint | undefined;

  const primaryEntryInvestmentShareBps = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "primaryEntryInvestmentShareBps",
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
    paymentTokenSymbol ?? contractBalance?.symbol ?? contest?.settings?.paymentTokenSymbol ?? "";

  const formatTokenAmount = (
    value?: bigint,
    {
      fractionDigits = 2,
      decimals = tokenDecimals,
    }: { fractionDigits?: number; decimals?: number } = {},
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

  const currentPrimarySharePercent =
    currentPrimaryShareBps !== undefined ? Number(currentPrimaryShareBps) / 100 : undefined;
  const primaryEntryInvestmentSharePercent =
    primaryEntryInvestmentShareBps !== undefined
      ? Number(primaryEntryInvestmentShareBps) / 100
      : undefined;

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
    <div className="flex flex-col gap-4">
      {/* Contest Contract Details */}
      <div>
        {/* Contract panel */}
        <div className="bg-white min-h-[160px]">
          <div className="flex flex-col gap-1.5 font-mono text-xs">
            {/* Contract Status */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Contract State</span>
              <span className={`${getStatusColor(contractState)}`}>
                {getStatusLabel(contractState)}
              </span>
            </div>

            {/* Contract Balance */}
            {contractBalance?.value !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Contract Balance</span>
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

            {currentPrimaryShareBps !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Primary side share</span>
                <span className="text-gray-900 font-semibold">
                  {currentPrimarySharePercent?.toFixed(2) ?? "..."}%
                </span>
              </div>
            )}

            {primaryEntryInvestmentShareBps !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Secondary → owner mint leg</span>
                <span className="text-gray-900 font-semibold">
                  {primaryEntryInvestmentSharePercent?.toFixed(2) ?? "..."}%
                </span>
              </div>
            )}

            {/* Primary Side Balance (Total) */}
            {primarySideBalance !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Contest </span>
                <span className="text-gray-900 font-semibold">
                  {formatTokenAmount(primarySideBalance, { fractionDigits: 4 })}{" "}
                  {resolvedTokenSymbol}
                </span>
              </div>
            )}

            {/* Primary Prize Pool (Base) */}
            {primaryPrizePool !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 pl-4">↳ Deposits</span>
                <span className="text-gray-900">
                  {formatTokenAmount(primaryPrizePool, { fractionDigits: 4 })} {resolvedTokenSymbol}
                </span>
              </div>
            )}

            {/* Secondary Side Balance */}
            {secondarySideBalance !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Prediction</span>
                <span className="text-gray-900 font-semibold">
                  {formatTokenAmount(secondarySideBalance, { fractionDigits: 4 })}{" "}
                  {resolvedTokenSymbol}
                </span>
              </div>
            )}

            {totalSecondaryLiquidity !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 pl-4">↳ Winner pool liquidity</span>
                <span className="text-gray-900">
                  {formatTokenAmount(totalSecondaryLiquidity, { fractionDigits: 4 })}{" "}
                  {resolvedTokenSymbol}
                </span>
              </div>
            )}

            {/* <hr className="my-2" /> */}

            {/* <hr className="my-2" /> */}

            {/* Oracle Address */}
            {/* {oracleAddress && chainId && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Oracle</span>
                {createExplorerLinkJSX(
                  oracleAddress,
                  chainId,
                  `${oracleAddress?.slice(0, 6)}...${oracleAddress?.slice(-4)}`,
                  "text-blue-600 hover:text-blue-800 underline",
                )}
              </div>
            )} */}

            {/* Oracle Fee */}
            {/* {contractOracleFee !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Oracle Fee</span>
                <span className="text-gray-900">{Number(contractOracleFee) / 100}%</span>
              </div>
            )} */}

            {/* Accumulated Oracle Fee */}
            {/* {accumulatedOracleFee !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600 pl-4">↳ Accumulated</span>
                <span className="text-gray-900">
                  {formatTokenAmount(accumulatedOracleFee, { fractionDigits: 4 })}{" "}
                  {resolvedTokenSymbol}
                </span>
              </div>
            )} */}

            {/* Expiration */}
            {/* {expiryTimestamp && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Contract Expires</span>
                <span className="text-gray-900">
                  {new Date(Number(expiryTimestamp) * 1000).toLocaleString()}
                </span>
              </div>
            )} */}
          </div>

          <hr className="mt-4 mb-2" />

          {/* Escrow Contract */}
          {contest?.address && chainId && (
            <div className="flex items-center gap-2 font-display text-sm">
              {/* <span className="text-gray-600">Contract</span> */}
              {createExplorerLinkJSX(
                contest.address,
                chainId,
                "View Contract",
                "text-gray-600 hover:text-gray-800 underline",
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
