import React, { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../utils/apiClient";
import type { AdminBatchLockContestsResponse } from "../types/admin";
import type { AdminBatchSideBetsResponse } from "../types/sideBet";

export const AdminPage: React.FC = () => {
  const [lockRunning, setLockRunning] = useState(false);
  const [lockResult, setLockResult] = useState<AdminBatchLockContestsResponse | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);

  const [sideTournamentId, setSideTournamentId] = useState("");
  const [sideLockRunning, setSideLockRunning] = useState(false);
  const [sideSettleRunning, setSideSettleRunning] = useState(false);
  const [sideCloseRunning, setSideCloseRunning] = useState(false);
  const [sideLockResult, setSideLockResult] = useState<AdminBatchSideBetsResponse | null>(null);
  const [sideSettleResult, setSideSettleResult] = useState<AdminBatchSideBetsResponse | null>(null);
  const [sideCloseResult, setSideCloseResult] = useState<AdminBatchSideBetsResponse | null>(null);
  const [sideError, setSideError] = useState<string | null>(null);

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
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setLockError(message);
    } finally {
      setLockRunning(false);
    }
  }, []);

  const sideBody = useCallback(() => {
    const tid = sideTournamentId.trim();
    return tid ? { tournamentId: tid } : {};
  }, [sideTournamentId]);

  const runSideLock = useCallback(async () => {
    setSideLockRunning(true);
    setSideError(null);
    setSideLockResult(null);
    try {
      const result = await apiClient.post<AdminBatchSideBetsResponse>(
        "/admin/bets/side/lock",
        sideBody(),
        { requiresAuth: true },
      );
      setSideLockResult(result);
    } catch (e: unknown) {
      setSideError(e instanceof Error ? e.message : String(e));
    } finally {
      setSideLockRunning(false);
    }
  }, [sideBody]);

  const runSideSettle = useCallback(async () => {
    setSideSettleRunning(true);
    setSideError(null);
    setSideSettleResult(null);
    try {
      const result = await apiClient.post<AdminBatchSideBetsResponse>(
        "/admin/bets/side/settle",
        sideBody(),
        { requiresAuth: true },
      );
      setSideSettleResult(result);
    } catch (e: unknown) {
      setSideError(e instanceof Error ? e.message : String(e));
    } finally {
      setSideSettleRunning(false);
    }
  }, [sideBody]);

  const runSideClose = useCallback(async () => {
    setSideCloseRunning(true);
    setSideError(null);
    setSideCloseResult(null);
    try {
      const result = await apiClient.post<AdminBatchSideBetsResponse>(
        "/admin/bets/side/close",
        sideBody(),
        { requiresAuth: true },
      );
      setSideCloseResult(result);
    } catch (e: unknown) {
      setSideError(e instanceof Error ? e.message : String(e));
    } finally {
      setSideCloseRunning(false);
    }
  }, [sideBody]);

  const failedRows = lockResult?.results.filter((r) => !r.success) ?? [];
  const sideBusy = sideLockRunning || sideSettleRunning || sideCloseRunning;

  const renderSideSummary = (label: string, result: AdminBatchSideBetsResponse | null) => {
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
              <li key={r.marketId}>
                <span className="font-mono text-xs">{r.marketId}</span>
                {r.error ? `: ${r.error}` : ""}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
        <p className="text-sm sm:text-base text-gray-600">Staff tools and support workflows.</p>
      </div>

      <div className="bg-white rounded-sm shadow border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Contests</h2>
        <p className="text-sm text-gray-600 mb-3">
          Lock on-chain winner-pool (secondary) entries for every contest that is{" "}
          <span className="font-medium">ACTIVE</span>.
        </p>
        <button
          type="button"
          onClick={runLockEligibleContests}
          disabled={lockRunning}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {lockRunning ? "Running…" : "Lock Winner Pool"}
        </button>
        {lockRunning ? (
          <p className="mt-2 text-sm text-gray-500">Running batch lock. Do not close this tab.</p>
        ) : null}
        {lockError ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {lockError}
          </p>
        ) : null}
        {lockResult && !lockRunning ? (
          <div className="mt-3 text-sm text-gray-700 space-y-2">
            <p>
              <span className="font-medium">Total:</span> {lockResult.total} &mdash;{" "}
              <span className="font-medium">Succeeded:</span> {lockResult.succeeded} &mdash;{" "}
              <span className="font-medium">Failed:</span> {lockResult.failed}
            </p>
            {failedRows.length > 0 ? (
              <div>
                <p className="font-medium text-gray-800 mb-1">Failures</p>
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                  {failedRows.map((r) => (
                    <li key={r.contestId}>
                      <span className="font-mono text-xs">{r.contestId}</span>
                      {r.error ? `: ${r.error}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="bg-white rounded-sm shadow border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Side bets</h2>
        <p className="text-sm text-gray-600 mb-3">
          Manual lifecycle: lock markets (no new tickets), settle against official results when the
          tournament is <span className="font-medium">COMPLETED</span>, then close settled markets.
          Requires <span className="font-medium">SIDE_BETS_ENABLED=true</span> on the server.
        </p>
        <label className="block text-xs font-medium text-gray-700 mb-1" htmlFor="side-bet-tid">
          Optional tournament id scope (leave blank for all)
        </label>
        <input
          id="side-bet-tid"
          type="text"
          value={sideTournamentId}
          onChange={(e) => setSideTournamentId(e.target.value)}
          placeholder="Tournament cuid"
          className="mb-3 w-full max-w-md rounded-sm border border-gray-300 px-2 py-1.5 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runSideLock()}
            disabled={sideBusy}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {sideLockRunning ? "Locking…" : "Lock side bets"}
          </button>
          <button
            type="button"
            onClick={() => void runSideSettle()}
            disabled={sideBusy}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {sideSettleRunning ? "Settling…" : "Settle side bets"}
          </button>
          <button
            type="button"
            onClick={() => void runSideClose()}
            disabled={sideBusy}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-sm hover:bg-gray-900 disabled:opacity-50"
          >
            {sideCloseRunning ? "Closing…" : "Close side bets"}
          </button>
        </div>
        {sideError ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {sideError}
          </p>
        ) : null}
        {renderSideSummary("Lock", sideLockResult)}
        {renderSideSummary("Settle", sideSettleResult)}
        {renderSideSummary("Close", sideCloseResult)}
      </div>

      <div className="bg-white rounded-sm shadow border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Navigation</h2>
        <div className="flex flex-col gap-2 text-sm">
          <Link to="/admin/users" className="text-blue-600 hover:text-blue-800 hover:underline">
            Manage Users
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
