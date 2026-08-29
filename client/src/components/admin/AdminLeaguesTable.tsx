import type { AdminDashboardLeague } from "../../types/admin";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AdminLeaguesTable({ leagues }: { leagues: AdminDashboardLeague[] }) {
  if (leagues.length === 0) {
    return <p className="text-sm text-gray-500 py-4">No leagues yet.</p>;
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-sm">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-3 py-2 font-medium">League</th>
            <th className="px-3 py-2 font-medium text-right">Members</th>
            <th className="px-3 py-2 font-medium text-right">Contests</th>
            <th className="px-3 py-2 font-medium">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {leagues.map((league) => (
            <tr key={league.id} className="hover:bg-gray-50">
              <td className="px-3 py-2">
                <div className="font-medium text-gray-900">{league.name}</div>
                {league.description ? (
                  <div className="text-xs text-gray-500 line-clamp-2">{league.description}</div>
                ) : (
                  <div className="text-xs text-gray-400 font-mono truncate max-w-[200px]">
                    {league.id}
                  </div>
                )}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{league.memberCount}</td>
              <td className="px-3 py-2 text-right tabular-nums">{league.contestCount}</td>
              <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                {formatDate(league.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
