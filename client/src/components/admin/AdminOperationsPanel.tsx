import React, { useCallback, useState } from "react";
import apiClient from "../../utils/apiClient";
import type { AdminBatchLockContestsResponse } from "../../types/admin";

type BatchRow = { success: boolean; error?: string; contestId?: string };

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
            <li key={r.contestId}>
              <span className="font-mono text-xs">{r.contestId}</span>
              {r.error ? `: ${r.error}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export interface AdminOperationsPanelProps {
  onActionComplete?: () => void;
}

export const AdminOperationsPanel: React.FC<AdminOperationsPanelProps> = ({
  onActionComplete,
}) => {
  const [lockRunning, setLockRunning] = useState(false);
  const [lockResult, setLockResult] = useState<AdminBatchLockContestsResponse | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);

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
};
