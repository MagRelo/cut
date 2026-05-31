import React, { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { AdminStatCard } from "../components/admin/AdminStatCard";
import { AdminOperationsPanel } from "../components/admin/AdminOperationsPanel";
import { useAdminDashboardQuery, useAdminSideBetReportQuery } from "../hooks/useAdminDashboard";
import { queryKeys } from "../utils/queryKeys";
import type { AdminDashboardContest } from "../types/admin";

function formatUsd(amount: number): string {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "bg-blue-100 text-blue-800";
    case "OPEN":
      return "bg-emerald-100 text-emerald-800";
    case "LOCKED":
      return "bg-amber-100 text-amber-800";
    case "SETTLED":
    case "CLOSED":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function ContestStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(status)}`}>
      {status}
    </span>
  );
}

type ContestScopeFilter = "all" | "public" | "league";

function ContestsTable({ contests }: { contests: AdminDashboardContest[] }) {
  if (contests.length === 0) {
    return <p className="text-sm text-gray-500 py-4">No contests match this filter.</p>;
  }
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-sm">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-3 py-2 font-medium">Contest</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium text-right">Entry</th>
            <th className="px-3 py-2 font-medium text-right">Lineups</th>
            <th className="px-3 py-2 font-medium text-right">Primary cash</th>
            <th className="px-3 py-2 font-medium text-right">Secondary</th>
            <th className="px-3 py-2 font-medium">League</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {contests.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="px-3 py-2">
                <div className="font-medium text-gray-900">{c.name}</div>
                <div className="text-xs text-gray-400 font-mono truncate max-w-[200px]">{c.id}</div>
              </td>
              <td className="px-3 py-2">
                <ContestStatusBadge status={c.status} />
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {c.primaryDeposit > 0 ? `$${formatUsd(c.primaryDeposit)}` : "Free"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{c.lineupCount}</td>
              <td className="px-3 py-2 text-right tabular-nums font-medium">
                ${formatUsd(c.estimatedPrimaryCash)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{c.secondaryParticipantCount}</td>
              <td className="px-3 py-2 text-gray-600">{c.userGroupName ?? "—"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50 text-gray-800 font-medium">
          <tr>
            <td className="px-3 py-2" colSpan={3}>
              Totals
            </td>
            <td className="px-3 py-2 text-right tabular-nums">
              {contests.reduce((s, c) => s + c.lineupCount, 0)}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">
              ${formatUsd(contests.reduce((s, c) => s + c.estimatedPrimaryCash, 0))}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">
              {contests.reduce((s, c) => s + c.secondaryParticipantCount, 0)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export const AdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [contestScope, setContestScope] = useState<ContestScopeFilter>("all");
  const dashboardQuery = useAdminDashboardQuery();
  const tournamentId = dashboardQuery.data?.tournament?.id;
  const sideReportQuery = useAdminSideBetReportQuery(
    tournamentId,
    Boolean(tournamentId) && (dashboardQuery.data?.operations.sideBetsEnabled ?? false),
  );

  const refreshAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
  }, [queryClient]);

  const dashboard = dashboardQuery.data;
  const sideReport = sideReportQuery.data;
  const loading = dashboardQuery.isLoading;
  const error =
    dashboardQuery.error instanceof Error
      ? dashboardQuery.error.message
      : dashboardQuery.error
        ? String(dashboardQuery.error)
        : null;

  const t = dashboard?.tournament;
  const contests = dashboard?.contests;
  const filteredContests = useMemo(() => {
    const items = contests?.items ?? [];
    if (contestScope === "public") {
      return items.filter((contest) => !contest.userGroupName);
    }
    if (contestScope === "league") {
      return items.filter((contest) => Boolean(contest.userGroupName));
    }
    return items;
  }, [contests?.items, contestScope]);
  const parlays = dashboard?.parlays;
  const ops = dashboard?.operations;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            Current week overview — contests, cash, and parlays.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={refreshAll}
            disabled={dashboardQuery.isFetching}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {dashboardQuery.isFetching ? "Refreshing…" : "Refresh"}
          </button>
          <Link
            to="/admin/users"
            className="px-3 py-1.5 text-sm font-medium text-blue-700 border border-blue-200 rounded-sm hover:bg-blue-50"
          >
            Manage users
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <ErrorMessage message={error} />
      ) : !t ? (
        <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 text-sm text-amber-900">
          No active tournament. Set <span className="font-medium">manualActive</span> on a tournament to
          populate this dashboard.
        </div>
      ) : (
        <>
          <section className="bg-white rounded-sm shadow border border-gray-200 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t.name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {formatDate(t.startDate)} – {formatDate(t.endDate)}
                  <span className="mx-2 text-gray-300">|</span>
                  <span className="font-medium text-gray-700">{t.status}</span>
                  {t.roundDisplay ? (
                    <>
                      <span className="mx-2 text-gray-300">|</span>
                      {t.roundDisplay}
                      {t.currentRound != null ? ` (R${t.currentRound})` : ""}
                    </>
                  ) : null}
                </p>
                {t.cutLine ? (
                  <p className="text-xs text-gray-500 mt-1">Cut: {t.cutLine}</p>
                ) : null}
              </div>
              <p className="text-xs text-gray-400 font-mono">{t.id}</p>
            </div>
            {dashboard?.generatedAt ? (
              <p className="text-xs text-gray-400 mt-3">
                Snapshot {new Date(dashboard.generatedAt).toLocaleString()}
              </p>
            ) : null}
          </section>

          <section className="bg-white rounded-sm shadow border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-1">Contests</h2>
                <p className="text-xs text-gray-500">
                  {contests?.summary.total ?? 0} contest(s) —{" "}
                  {Object.entries(contests?.summary.byStatus ?? {})
                    .map(([s, n]) => `${s}: ${n}`)
                    .join(", ") || "none"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["all", "All"],
                    ["public", "Public"],
                    ["league", "League"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setContestScope(value)}
                    className={`px-3 py-1 text-xs font-medium rounded-sm border transition-colors ${
                      contestScope === value
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <ContestsTable contests={filteredContests} />
          </section>

          {ops?.sideBetsEnabled ? (
            <section className="bg-white rounded-sm shadow border border-gray-200 p-4 space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-1">Parlays</h2>
                <p className="text-xs text-gray-500">
                  Side-bet markets and tickets for this tournament.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <AdminStatCard
                  label="Stake inflow"
                  value={formatUsd(parlays?.totals.stakeInflow ?? 0)}
                />
                <AdminStatCard label="Open stake" value={formatUsd(parlays?.totals.openStake ?? 0)} />
                <AdminStatCard
                  label="Open liability"
                  value={formatUsd(parlays?.totals.openLiability ?? 0)}
                  variant="warning"
                />
                <AdminStatCard label="Tickets" value={parlays?.totals.ticketCount ?? 0} />
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                <div>
                  <span className="font-medium text-gray-700">Markets: </span>
                  {Object.entries(parlays?.marketsByStatus ?? {})
                    .map(([s, n]) => `${s} ${n}`)
                    .join(", ") || "none"}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Tickets: </span>
                  {Object.entries(parlays?.ticketsByStatus ?? {})
                    .map(([s, n]) => `${s} ${n}`)
                    .join(", ") || "none"}
                </div>
              </div>

              {sideReportQuery.isLoading ? (
                <div className="flex justify-center py-6">
                  <LoadingSpinner />
                </div>
              ) : sideReportQuery.isError ? (
                <p className="text-sm text-amber-700">
                  Ticket detail report unavailable (
                  {sideReportQuery.error instanceof Error
                    ? sideReportQuery.error.message
                    : "error"}
                  ).
                </p>
              ) : sideReport && sideReport.tickets.length > 0 ? (
                <div>
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto border border-gray-200 rounded-sm">
                    <table className="min-w-full text-xs text-left">
                      <thead className="bg-gray-100 text-gray-700 sticky top-0">
                        <tr>
                          <th className="px-2 py-2 font-medium">User</th>
                          <th className="px-2 py-2 font-medium">Lineup</th>
                          <th className="px-2 py-2 font-medium">Parlay</th>
                          <th className="px-2 py-2 font-medium text-right">Stake</th>
                          <th className="px-2 py-2 font-medium">Odds</th>
                          <th className="px-2 py-2 font-medium text-right">Payout</th>
                          <th className="px-2 py-2 font-medium">Status</th>
                          <th className="px-2 py-2 font-medium">Mkt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sideReport.tickets.map((ticket) => (
                          <tr key={ticket.id} className="hover:bg-gray-50">
                            <td className="px-2 py-1.5 max-w-[140px] truncate" title={ticket.userEmail ?? ""}>
                              {ticket.userName ?? ticket.userEmail ?? "—"}
                            </td>
                            <td className="px-2 py-1.5 max-w-[120px] truncate" title={ticket.lineupName}>
                              {ticket.lineupName}
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              {ticket.hitsRequired}/{ticket.topN}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {ticket.stakeAmount.toFixed(2)}
                            </td>
                            <td className="px-2 py-1.5">{ticket.americanDisplayAtPlacement}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {ticket.potentialPayout.toFixed(2)}
                            </td>
                            <td className="px-2 py-1.5">{ticket.status}</td>
                            <td className="px-2 py-1.5">{ticket.marketStatus}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No parlay tickets this week.</p>
              )}
            </section>
          ) : null}

          <section className="bg-white rounded-sm shadow border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Batch operations</h2>
            <AdminOperationsPanel
              tournamentId={tournamentId}
              sideBetsEnabled={ops?.sideBetsEnabled ?? false}
              onActionComplete={refreshAll}
            />
          </section>
        </>
      )}
    </div>
  );
};

export default AdminPage;
