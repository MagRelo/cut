import { Link, useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "../components/common/PageHeader";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { UserGroupMembersList } from "../components/userGroup/UserGroupMembersList";
import { UserGroupSettings } from "../components/userGroup/UserGroupSettings";
import { UserGroupMemberManagement } from "../components/userGroup/UserGroupMemberManagement";
import { UserGroupInvitePanel } from "../components/userGroup/UserGroupInvitePanel";
import { ContestList } from "../components/contest/ContestList";
import { useUserGroupQuery } from "../hooks/useUserGroupQuery";
import { useContestsQuery } from "../hooks/useContestQuery";
import { useActiveTournament } from "../hooks/useTournamentData";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { useAuth } from "../contexts/AuthContext";
import { isApiError } from "../utils/apiError";

export const UserGroupDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: userGroup, isLoading, error, refetch } = useUserGroupQuery(id);
  const { tournament } = useActiveTournament();
  const {
    data: leagueContests,
    isLoading: isContestsLoading,
    error: contestsError,
  } = useContestsQuery(tournament?.id, undefined, { userGroupId: id });

  const errorMessage =
    error && isApiError(error) && error.statusCode === 404
      ? "League not found"
      : error instanceof Error
        ? error.message
        : error
          ? String(error)
          : null;

  const contestsErrorMessage =
    contestsError instanceof Error ? contestsError.message : null;

  const isAdmin = userGroup?.currentUserRole === "ADMIN";

  const handleDeleted = () => {
    navigate("/user-groups");
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || !userGroup) {
    return (
      <div className="space-y-4 p-4">
        <ErrorMessage message={errorMessage || "Failed to load league"} />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <Breadcrumbs
        items={[
          { label: "Leagues", path: "/user-groups" },
          { label: userGroup.name, path: `/user-groups/${id}` },
        ]}
      />
      <PageHeader title={userGroup.name} />
      {userGroup.description && (
        <div className="bg-white rounded-sm shadow p-4">
          <p className="text-gray-700">{userGroup.description}</p>
        </div>
      )}

      <div className="bg-white rounded-sm shadow p-4">
        <div className="mb-6">
          <div className="text-sm text-gray-500">Members</div>
          <div className="text-2xl font-bold text-gray-900">{userGroup.memberCount}</div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Members</h3>
          <UserGroupMembersList members={userGroup.members} currentUserId={user?.id} />
        </div>
      </div>

      <div className="bg-white rounded-sm shadow p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Contests</h3>
          {isAdmin && (
            <Link
              to={`/contests/create?userGroupId=${userGroup.id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium shrink-0"
            >
              Create Contest
            </Link>
          )}
        </div>
        <ContestList
          contests={leagueContests ?? []}
          loading={isContestsLoading}
          error={contestsErrorMessage}
        />
      </div>

      {isAdmin && (
        <>
          <div className="bg-white rounded-sm shadow p-4">
            <UserGroupInvitePanel
              userGroupId={userGroup.id}
              inviteCode={userGroup.inviteCode}
              inviteUrl={userGroup.inviteUrl}
              onInviteUpdated={() => refetch()}
            />
          </div>

          <div className="bg-white rounded-sm shadow p-4">
            <UserGroupMemberManagement
              userGroupId={userGroup.id}
              members={userGroup.members}
              onMemberAdded={() => refetch()}
              onMemberRemoved={() => refetch()}
            />
          </div>

          <div className="bg-white rounded-sm shadow p-4">
            <UserGroupSettings
              userGroupId={userGroup.id}
              initialData={{
                name: userGroup.name,
                description: userGroup.description,
              }}
              onUpdated={() => refetch()}
              onDeleted={handleDeleted}
            />
          </div>
        </>
      )}
    </div>
  );
};
