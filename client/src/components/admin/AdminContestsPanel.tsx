import { useCallback, useMemo, useState } from "react";
import apiClient from "../../utils/apiClient";
import type {
  AdminDashboardContest,
  AdminDashboardResponse,
  AdminLockContestResponse,
} from "../../types/admin";

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

type ContestScopeFilter = "all" | "public" | "league";

function ContestsTable({
  contests,
  lockingId,
  lockErrors,
  onLock,
}: {
  contests: AdminDashboardContest[];
  lockingId: string | null;
  lockErrors: Record<string, string>;
  onLock: (contestId: string) => void;
}) {
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
            <th className="px-3 py-2 font-medium text-right">Primary</th>
            <th className="px-3 py-2 font-medium text-right">Secondary</th>
            <th className="px-3 py-2 font-medium">League</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {contests.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="px-3 py-2">
                <div className="font-medium text-gray-900">{c.name}</div>
                <div className="text-xs text-gray-500">{c.eventName}</div>
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-col items-start gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(c.status)}`}
                    >
                      {c.status}
                    </span>
                    {c.status === "ACTIVE" ? (
                      <button
                        type="button"
                        onClick={() => onLock(c.id)}
                        disabled={lockingId === c.id}
                        className="px-2 py-0.5 text-xs font-medium text-white bg-blue-600 rounded-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {lockingId === c.id ? "Locking…" : "Lock"}
                      </button>
                    ) : null}
                  </div>
                  {lockErrors[c.id] ? (
                    <p className="text-xs text-red-600" role="alert">
                      {lockErrors[c.id]}
                    </p>
                  ) : null}
                </div>
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

export function AdminContestsPanel({
  contests,
  onActionComplete,
}: {
  contests: AdminDashboardResponse["contests"] | undefined;
  onActionComplete: () => void;
}) {
  const [contestScope, setContestScope] = useState<ContestScopeFilter>("all");
  const [lockingId, setLockingId] = useState<string | null>(null);
  const [lockErrors, setLockErrors] = useState<Record<string, string>>({});
  const items = contests?.items ?? [];

  const lockContest = useCallback(
    async (contestId: string) => {
      setLockingId(contestId);
      setLockErrors((prev) => {
        const next = { ...prev };
        delete next[contestId];
        return next;
      });
      try {
        await apiClient.post<AdminLockContestResponse>(
          `/admin/contests/${encodeURIComponent(contestId)}/lock`,
          undefined,
          { requiresAuth: true },
        );
        onActionComplete();
      } catch (e: unknown) {
        setLockErrors((prev) => ({
          ...prev,
          [contestId]: e instanceof Error ? e.message : String(e),
        }));
      } finally {
        setLockingId(null);
      }
    },
    [onActionComplete],
  );
  const filteredContests = useMemo(() => {
    if (contestScope === "public") {
      return items.filter((contest) => !contest.userGroupName);
    }
    if (contestScope === "league") {
      return items.filter((contest) => Boolean(contest.userGroupName));
    }
    return items;
  }, [items, contestScope]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <p className="text-xs text-gray-500">
          {contests?.summary.total ?? 0} contest(s) —{" "}
          {Object.entries(contests?.summary.byStatus ?? {})
            .map(([s, n]) => `${s}: ${n}`)
            .join(", ") || "none"}
        </p>
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
      <ContestsTable
        contests={filteredContests}
        lockingId={lockingId}
        lockErrors={lockErrors}
        onLock={(contestId) => void lockContest(contestId)}
      />
    </div>
  );
}
