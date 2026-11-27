import { useCallback, useMemo } from "react";
import { useReadContracts } from "wagmi";
import type { Abi } from "viem";
import ContestContract from "../utils/contracts/ContestController.json";
import { contestPaymentDecimals } from "../lib/paymentTokenSpend";
import { contestStateFromChain, isSupportedChainId, type ContestState } from "./contestState";
import { CONTEST_CHAIN_READ_QUERY } from "./readPolicy";

const SCALAR_READS = [
  "state",
  "paymentToken",
  "primaryDepositAmount",
  "primaryPrizePool",
  "totalSecondaryLiquidity",
  "getPrimarySideBalance",
  "primaryDepositSecondarySubsidyBps",
] as const;

type ScalarRead = (typeof SCALAR_READS)[number];

export interface ContestChainSource {
  address?: string | null;
  chainId?: number | null;
  settings?: { paymentTokenAddress?: string | null } | null;
}

export interface ContestChainFieldFailure {
  state: boolean;
  paymentToken: boolean;
  primaryDepositAmount: boolean;
  primaryPrizePool: boolean;
  totalSecondaryLiquidity: boolean;
  primarySideBalance: boolean;
  subsidyBps: boolean;
}

export interface ContestChainSnapshot {
  state: ContestState | undefined;
  paymentToken: `0x${string}` | undefined;
  /** On-chain token, or the contest settings hint while that read is in flight. */
  paymentTokenAddress: string;
  paymentDecimals: number;
  primaryDepositAmount: bigint | undefined;
  primaryPrizePool: bigint | undefined;
  totalSecondaryLiquidity: bigint | undefined;
  primarySideBalance: bigint | undefined;
  primaryDepositSecondarySubsidyBps: bigint | undefined;
  isLoading: boolean;
  failed: ContestChainFieldFailure;
  refetch: () => Promise<void>;
}

const NO_FAILURES: ContestChainFieldFailure = {
  state: false,
  paymentToken: false,
  primaryDepositAmount: false,
  primaryPrizePool: false,
  totalSecondaryLiquidity: false,
  primarySideBalance: false,
  subsidyBps: false,
};

interface ReadRow {
  status: string;
  result?: unknown;
}

function readRow(results: readonly ReadRow[] | undefined, index: number): {
  value: unknown;
  failed: boolean;
} {
  const item = results?.[index];
  if (!item) return { value: undefined, failed: false };
  if (item.status === "failure") return { value: undefined, failed: true };
  return { value: item.result, failed: false };
}

function asBigint(value: unknown): bigint | undefined {
  return typeof value === "bigint" ? value : undefined;
}

function asAddress(value: unknown): `0x${string}` | undefined {
  return typeof value === "string" ? (value as `0x${string}`) : undefined;
}

export function useContestChain(
  contest: ContestChainSource | null | undefined,
  options?: { enabled?: boolean },
): ContestChainSnapshot {
  const address = contest?.address ?? "";
  const chainId = isSupportedChainId(contest?.chainId) ? contest.chainId : undefined;
  const enabled = (options?.enabled ?? true) && Boolean(address) && chainId !== undefined;
  const contestAbi = ContestContract.abi as Abi;
  const hint = contest?.settings?.paymentTokenAddress ?? "";

  const contracts = useMemo(
    () =>
      enabled
        ? SCALAR_READS.map((functionName) => ({
            address: address as `0x${string}`,
            abi: contestAbi,
            functionName,
            chainId,
          }))
        : [],
    [enabled, address, chainId, contestAbi],
  );

  const query = useReadContracts({
    contracts,
    query: {
      enabled,
      ...CONTEST_CHAIN_READ_QUERY,
    },
  });

  const results = query.data as readonly ReadRow[] | undefined;
  const rows = Object.fromEntries(
    SCALAR_READS.map((name, index) => [name, readRow(results, index)]),
  ) as Record<ScalarRead, { value: unknown; failed: boolean }>;

  const paymentToken = asAddress(rows.paymentToken.value);
  const paymentTokenAddress = paymentToken ?? hint;
  const paymentDecimals = contestPaymentDecimals(chainId ?? 0, paymentTokenAddress);

  const failed: ContestChainFieldFailure = enabled
    ? {
        state: rows.state.failed,
        paymentToken: rows.paymentToken.failed,
        primaryDepositAmount: rows.primaryDepositAmount.failed,
        primaryPrizePool: rows.primaryPrizePool.failed,
        totalSecondaryLiquidity: rows.totalSecondaryLiquidity.failed,
        primarySideBalance: rows.getPrimarySideBalance.failed,
        subsidyBps: rows.primaryDepositSecondarySubsidyBps.failed,
      }
    : NO_FAILURES;

  const { refetch: refetchQuery } = query;
  const refetch = useCallback(async () => {
    await refetchQuery();
  }, [refetchQuery]);

  return {
    state: contestStateFromChain(rows.state.value),
    paymentToken,
    paymentTokenAddress,
    paymentDecimals,
    primaryDepositAmount: asBigint(rows.primaryDepositAmount.value),
    primaryPrizePool: asBigint(rows.primaryPrizePool.value),
    totalSecondaryLiquidity: asBigint(rows.totalSecondaryLiquidity.value),
    primarySideBalance: asBigint(rows.getPrimarySideBalance.value),
    primaryDepositSecondarySubsidyBps: asBigint(rows.primaryDepositSecondarySubsidyBps.value),
    isLoading: enabled && query.isLoading,
    failed,
    refetch,
  };
}
