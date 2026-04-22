import { useMemo } from "react";
import { formatUnits } from "viem";

import type { Contest, DetailedResult, SecondaryPayoutResult } from "../../types/contest";
import { PositionBadge } from "./PositionBadge";

interface ContestResultsPanelProps {
  contest: Contest;
}

function formatTokenAmount(valueWei: bigint, fractionDigits = 2) {
  const valueStr = formatUnits(valueWei, 18);
  const [whole, fraction = ""] = valueStr.split(".");
  const wholeWithCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (fractionDigits <= 0) return wholeWithCommas;
  const fixedFraction = fraction.padEnd(fractionDigits, "0").slice(0, fractionDigits);
  return `${wholeWithCommas}.${fixedFraction}`;
}

function primaryPayoutWei(result: DetailedResult, layer1PoolWei: bigint | null): bigint | null {
  if (result.payoutBasisPoints <= 0) return null;
  try {
    if (result.payoutAmountWei !== undefined || result.positionBonusAmountWei !== undefined) {
      const p = BigInt(result.payoutAmountWei ?? "0");
      const b = BigInt(result.positionBonusAmountWei ?? "0");
      return p + b;
    }
    if (layer1PoolWei !== null) {
      return (layer1PoolWei * BigInt(Math.floor(result.payoutBasisPoints))) / 10000n;
    }
  } catch {
    return null;
  }
  return null;
}

function secondaryAmountWei(row: SecondaryPayoutResult): bigint | null {
  try {
    return BigInt(row.amountWei);
  } catch {
    return null;
  }
}

export const ContestResultsPanel: React.FC<ContestResultsPanelProps> = ({ contest }) => {
  const primaryRowsWithPayout = useMemo(() => {
    return [...(contest.results?.detailedResults ?? [])]
      .filter((r) => r.payoutBasisPoints > 0)
      .sort((a, b) => {
        if (a.position !== b.position) return a.position - b.position;
        return a.entryId.localeCompare(b.entryId);
      });
  }, [contest.results?.detailedResults]);

  const layer1PoolWei = useMemo(() => {
    const snapshot = contest.results?.snapshot;
    if (!snapshot) return null;
    try {
      if (snapshot.primaryPrizePoolSubsidy !== undefined) {
        return BigInt(snapshot.primaryPrizePool) + BigInt(snapshot.primaryPrizePoolSubsidy);
      }
      return BigInt(snapshot.primaryPrizePool);
    } catch {
      return null;
    }
  }, [contest.results?.snapshot]);

  const sortedSecondaryPayouts = useMemo(() => {
    const rows = contest.results?.secondaryPayouts ?? [];
    return [...rows].sort((a, b) => {
      const wa = secondaryAmountWei(a) ?? 0n;
      const wb = secondaryAmountWei(b) ?? 0n;
      if (wa === wb) return a.walletAddress.localeCompare(b.walletAddress);
      return wa < wb ? 1 : -1;
    });
  }, [contest.results?.secondaryPayouts]);

  return (
    <div className="space-y-6 pb-6">
      <div>
        {primaryRowsWithPayout.length === 0 ? (
          <p className="text-sm text-gray-500">Results not available.</p>
        ) : (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Contest Winners
            </h4>
            {primaryRowsWithPayout.map((result, index) => {
              const payoutWei = primaryPayoutWei(result, layer1PoolWei);
              return (
                <div
                  key={`${result.entryId}-${index}`}
                  className="bg-white border border-gray-200 rounded-sm p-3 flex items-center gap-3"
                  style={{
                    borderLeftWidth: "3px",
                    borderLeftStyle: "solid",
                    borderLeftColor: result.userColor ?? undefined,
                  }}
                >
                  <PositionBadge
                    position={result.position}
                    isInTheMoney={result.payoutBasisPoints > 0}
                    isUser={false}
                    primaryActionsLocked
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {result.username}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {result.playerLastNames?.length
                        ? result.playerLastNames.join(", ")
                        : result.lineupName}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <div className="text-right">
                      {payoutWei !== null ? (
                        <>
                          <div className="text-lg font-bold text-green-600 leading-none tabular-nums">
                            ${formatTokenAmount(payoutWei, 2)}
                          </div>
                          <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
                            {result.score} pts
                          </div>
                        </>
                      ) : (
                        <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none">
                          {result.score} pts
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Winner pool payouts
        </h4>
        {sortedSecondaryPayouts.length === 0 ? null : (
          <div className="space-y-3 mt-2">
            {sortedSecondaryPayouts.map((row, index) => {
              const wei = secondaryAmountWei(row);

              return (
                <div
                  key={`${row.entryId}-${row.userId ?? "anon"}-${index}`}
                  className="bg-white border border-gray-200 rounded-sm p-3 flex items-center gap-3"
                  style={{
                    borderLeftWidth: "3px",
                    borderLeftStyle: "solid",
                    borderLeftColor: row.userColor ?? undefined,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{row.username}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {wei !== null ? (
                      <div className="text-lg font-bold text-emerald-600 leading-none tabular-nums">
                        ${formatTokenAmount(wei, 2)}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                    <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wide leading-none mt-0.5">
                      payout
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* 
      {contest.results?.pushPayoutsError ? (
        <p className="text-xs text-amber-700 border border-amber-200 bg-amber-50 rounded-sm px-2 py-1.5">
          Payout push note: {contest.results.pushPayoutsError}
        </p>
      ) : null} */}
    </div>
  );
};
