import { Link, useParams } from "react-router-dom";
import { AdminLeagueChat } from "../../components/admin/AdminLeagueChat";
import { useAdminLeagueMessagesQuery } from "../../hooks/useAdminLeagueMessages";

export function AdminLeagueChatPage() {
  const { leagueId = "" } = useParams<{ leagueId: string }>();
  const query = useAdminLeagueMessagesQuery(leagueId);
  const name = query.data?.league.name ?? "League chat";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="m-0 text-xl font-semibold text-gray-900">{name}</h1>
        <Link
          to="/admin?tab=leagues"
          className="text-sm font-medium text-blue-600 hover:text-blue-800 self-start sm:self-center"
        >
          Back to leagues
        </Link>
      </div>
      <AdminLeagueChat leagueId={leagueId} />
    </div>
  );
}

export default AdminLeagueChatPage;
