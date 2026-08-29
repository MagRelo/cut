import type { AdminDashboardContest, AdminDashboardEvent } from "../../types/admin";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function eventStatusClass(status: string): string {
  switch (status) {
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-800";
    case "NOT_STARTED":
      return "bg-emerald-100 text-emerald-800";
    case "COMPLETED":
      return "bg-gray-100 text-gray-700";
    case "CANCELLED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export function AdminEventsTable({
  events,
  contests,
}: {
  events: AdminDashboardEvent[];
  contests: AdminDashboardContest[];
}) {
  if (events.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 text-sm text-amber-900">
        No active events. Activate a competition event to populate this dashboard.
      </div>
    );
  }

  const contestCountByEvent = new Map<string, number>();
  for (const contest of contests) {
    contestCountByEvent.set(contest.eventId, (contestCountByEvent.get(contest.eventId) ?? 0) + 1);
  }

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-sm">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-3 py-2 font-medium">Event</th>
            <th className="px-3 py-2 font-medium">Sport</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Period</th>
            <th className="px-3 py-2 font-medium">Dates</th>
            <th className="px-3 py-2 font-medium text-right">Contests</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {events.map((event) => (
            <tr key={event.id} className="hover:bg-gray-50">
              <td className="px-3 py-2">
                <div className="font-medium text-gray-900">{event.name}</div>
                <div className="text-xs text-gray-400 font-mono truncate max-w-[200px]">{event.id}</div>
              </td>
              <td className="px-3 py-2 text-gray-600">{event.sportName}</td>
              <td className="px-3 py-2">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${eventStatusClass(event.status)}`}
                >
                  {event.status}
                </span>
              </td>
              <td className="px-3 py-2 text-gray-600">
                {event.periodDisplay ?? event.periodStatusDisplay ?? "—"}
              </td>
              <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                {formatDate(event.startDate)} – {formatDate(event.endDate)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {contestCountByEvent.get(event.id) ?? 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
