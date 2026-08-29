import React, { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { PageHeader } from "../components/common/PageHeader";
import { PageSection } from "../components/layout/PageSection";
import { AdminOperationsPanel } from "../components/admin/AdminOperationsPanel";
import { useAdminDashboardQuery } from "../hooks/useAdminDashboard";
import { queryKeys } from "../utils/queryKeys";
import type { AdminDashboardContest } from "../types/admin";

function formatUsd(amount: number): string {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
            <th className="px-3 py-2 font-medium">Event</th>
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
              <td className="px-3 py-2 text-gray-600">
                <div>{c.eventName}</div>
                {c.sportName ? <div className="text-xs text-gray-400">{c.sportName}</div> : null}
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
            <td className="px-3 py-2" colSpan={4}>
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

  const refreshAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
  }, [queryClient]);

  const dashboard = dashboardQuery.data;
  const loading = dashboardQuery.isLoading;
  const error =
    dashboardQuery.error instanceof Error
      ? dashboardQuery.error.message
      : dashboardQuery.error
        ? String(dashboardQuery.error)
        : null;

  const hasEvent = (dashboard?.events.length ?? 0) > 0;
  const activeEvents = dashboard?.events ?? [];
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

  const headerActions = (
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
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Admin dashboard" className="mb-3" actions={headerActions} />

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <ErrorMessage message={error} />
      ) : !hasEvent ? (
        <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 text-sm text-amber-900">
          No active events. Activate a competition event to populate this dashboard.
        </div>
      ) : (
        <>
          {activeEvents.length > 0 ? (
            <div className="text-sm text-gray-600">
              <span className="font-medium text-gray-800">Active events: </span>
              {activeEvents
                .map((event) => `${event.name} (${event.sportName})`)
                .join(" · ")}
            </div>
          ) : null}
          <PageSection>
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
            <AdminOperationsPanel onActionComplete={refreshAll} />
          </PageSection>
        </>
      )}
    </div>
  );
};

export default AdminPage;
