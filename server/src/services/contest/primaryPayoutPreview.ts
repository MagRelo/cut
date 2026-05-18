/**
 * Mirrors ContestController settleContest primary payout + secondary spill preview.
 * When the winning entry has no ERC1155 supply, all secondary liquidity is spilled
 * into primaryPrizePoolPayouts pro-rata by payoutBps (uses total secondary TVL, not
 * per-entry liquidity on the winner before aggregation).
 */

export function buildGrossPrimaryPayoutPreview(params: {
  primaryPrizePoolWei: bigint;
  totalSecondaryLiquidityWei: bigint;
  winningEntries: readonly string[];
  payoutBps: readonly number[];
  /** Net ERC1155 supply on secondaryWinningEntry (winningEntries[0]). */
  winnerSupply: bigint;
}): Map<string, bigint> {
  const { primaryPrizePoolWei, totalSecondaryLiquidityWei, winningEntries, payoutBps, winnerSupply } =
    params;

  const payoutBpsBigInt = payoutBps.map((bp) => BigInt(bp));
  const primaryPayoutPreview = new Map<string, bigint>();

  for (let i = 0; i < winningEntries.length; i++) {
    const entryId = winningEntries[i];
    const bps = payoutBpsBigInt[i];
    if (!entryId || bps === undefined) continue;
    primaryPayoutPreview.set(entryId, (primaryPrizePoolWei * bps) / 10000n);
  }

  if (totalSecondaryLiquidityWei > 0n && winnerSupply === 0n) {
    const poolToDistribute = totalSecondaryLiquidityWei;
    let distributed = 0n;
    for (let i = 0; i < winningEntries.length; i++) {
      const eid = winningEntries[i];
      const bps = payoutBpsBigInt[i];
      if (!eid || bps === undefined) continue;
      const extra = (poolToDistribute * bps) / 10000n;
      if (extra > 0n) {
        distributed += extra;
        primaryPayoutPreview.set(eid, (primaryPayoutPreview.get(eid) ?? 0n) + extra);
      }
    }
    if (distributed < poolToDistribute) {
      const first = winningEntries[0];
      if (first) {
        primaryPayoutPreview.set(
          first,
          (primaryPayoutPreview.get(first) ?? 0n) + (poolToDistribute - distributed),
        );
      }
    }
  }

  return primaryPayoutPreview;
}

export function applyOracleFeeWei(amountWei: bigint, oracleFeeBps: number): bigint {
  const feeBps = Math.max(0, Math.min(10000, Math.floor(oracleFeeBps)));
  if (feeBps === 0) return amountWei;
  if (feeBps >= 10000) return 0n;
  return (amountWei * BigInt(10000 - feeBps)) / 10000n;
}
