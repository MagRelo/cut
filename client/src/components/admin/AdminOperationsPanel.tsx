import React, { useCallback, useMemo, useState } from "react";
import apiClient from "../../utils/apiClient";
import type { AdminBatchLockContestsResponse } from "../../types/admin";
import type { AdminBatchSideBetsResponse } from "../../types/sideBet";

type BatchRow = { success: boolean; error?: string; contestId?: string; marketId?: string };

function renderBatchSummary(
  label: string,
  result: { total: number; succeeded: number; failed: number; results: BatchRow[] } | null,
) {
  if (!result) return null;
  const fails = result.results.filter((r) => !r.success);
  return (
    <div className="mt-2 text-sm text-gray-700 space-y-1">
      <p className="font-medium text-gray-800">{label}</p>
      <p>
        <span className="font-medium">Total:</span> {result.total} —{" "}
        <span className="font-medium">Succeeded:</span> {result.succeeded} —{" "}
        <span className="font-medium">Failed:</span> {result.failed}
      </p>
      {fails.length > 0 ? (
        <ul className="list-disc pl-5 space-y-1 text-gray-600">
          {fails.map((r) => (
            <li key={r.contestId ?? r.marketId}>
              <span className="font-mono text-xs">{r.contestId ?? r.marketId}</span>
              {r.error ? `: ${r.error}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export interface AdminOperationsPanelProps {
  section: "contest" | "side";
  tournamentId?: string;
  onActionComplete?: () => void;
}

export const AdminOperationsPanel: React.FC<AdminOperationsPanelProps> = ({
  section,
  tournamentId,
  onActionComplete,
}) => {
  const [lockRunning, setLockRunning] = useState(false);
  const [lockResult, setLockResult] = useState<AdminBatchLockContestsResponse | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);

  const [sideLockRunning, setSideLockRunning] = useState(false);
  const [sideSettleRunning, setSideSettleRunning] = useState(false);
  const [sideCloseRunning, setSideCloseRunning] = useState(false);
  const [sideLockResult, setSideLockResult] = useState<AdminBatchSideBetsResponse | null>(null);
  const [sideSettleResult, setSideSettleResult] = useState<AdminBatchSideBetsResponse | null>(null);
  const [sideCloseResult, setSideCloseResult] = useState<AdminBatchSideBetsResponse | null>(null);
  const [sideError, setSideError] = useState<string | null>(null);

  const sideBody = useMemo(
    () => (tournamentId?.trim() ? { tournamentId: tournamentId.trim() } : {}),
    [tournamentId],
  );

  const runLockEligibleContests = useCallback(async () => {
    setLockRunning(true);
    setLockResult(null);
    setLockError(null);
    try {
      const result = await apiClient.post<AdminBatchLockContestsResponse>(
        "/admin/contests/lock-eligible",
        undefined,
        { requiresAuth: true },
      );
      setLockResult(result);
      onActionComplete?.();
    } catch (e: unknown) {
      setLockError(e instanceof Error ? e.message : String(e));
    } finally {
      setLockRunning(false);
    }
  }, [onActionComplete]);

  const runSideLock = useCallback(async () => {
    setSideLockRunning(true);
    setSideError(null);
    setSideLockResult(null);
    try {
      const result = await apiClient.post<AdminBatchSideBetsResponse>(
        "/admin/bets/side/lock",
        sideBody,
        { requiresAuth: true },
      );
      setSideLockResult(result);
      onActionComplete?.();
    } catch (e: unknown) {
      setSideError(e instanceof Error ? e.message : String(e));
    } finally {
      setSideLockRunning(false);
    }
  }, [sideBody, onActionComplete]);

  const runSideSettle = useCallback(async () => {
    setSideSettleRunning(true);
    setSideError(null);
    setSideSettleResult(null);
    try {
      const result = await apiClient.post<AdminBatchSideBetsResponse>(
        "/admin/bets/side/settle",
        sideBody,
        { requiresAuth: true },
      );
      setSideSettleResult(result);
      onActionComplete?.();
    } catch (e: unknown) {
      setSideError(e instanceof Error ? e.message : String(e));
    } finally {
      setSideSettleRunning(false);
    }
  }, [sideBody, onActionComplete]);

  const runSideClose = useCallback(async () => {
    setSideCloseRunning(true);
    setSideError(null);
    setSideCloseResult(null);
    try {
      const result = await apiClient.post<AdminBatchSideBetsResponse>(
        "/admin/bets/side/close",
        sideBody,
        { requiresAuth: true },
      );
      setSideCloseResult(result);
      onActionComplete?.();
    } catch (e: unknown) {
      setSideError(e instanceof Error ? e.message : String(e));
    } finally {
      setSideCloseRunning(false);
    }
  }, [sideBody, onActionComplete]);

  const sideBusy = sideLockRunning || sideSettleRunning || sideCloseRunning;

  if (section === "contest") {
    return (
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-600 mb-3">
          Lock on-chain winner-pool entries for every <span className="font-medium">ACTIVE</span> contest.
        </p>
        <button
          type="button"
          onClick={() => void runLockEligibleContests()}
          disabled={lockRunning}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {lockRunning ? "Running…" : "Lock winner pool"}
        </button>
        {lockError ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {lockError}
          </p>
        ) : null}
        {renderBatchSummary("Lock", lockResult)}
      </div>
    );
  }

  return (
    <div className="mt-6 pt-4 border-t border-gray-200">
      <p className="text-xs text-gray-600 mb-3">Batch lock, settle, and close for this tournament week.</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void runSideLock()}
          disabled={sideBusy}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {sideLockRunning ? "Locking…" : "Lock"}
        </button>
        <button
          type="button"
          onClick={() => void runSideSettle()}
          disabled={sideBusy}
          className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          {sideSettleRunning ? "Settling…" : "Settle"}
        </button>
        <button
          type="button"
          onClick={() => void runSideClose()}
          disabled={sideBusy}
          className="px-3 py-1.5 text-sm font-medium text-white bg-gray-800 rounded-sm hover:bg-gray-900 disabled:opacity-50"
        >
          {sideCloseRunning ? "Closing…" : "Close"}
        </button>
      </div>
      {sideError ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {sideError}
        </p>
      ) : null}
      {renderBatchSummary("Lock", sideLockResult)}
      {renderBatchSummary("Settle", sideSettleResult)}
      {renderBatchSummary("Close", sideCloseResult)}
    </div>
  );
};
