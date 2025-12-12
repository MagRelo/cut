import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "../components/common/PageHeader";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { UserGroupMembersList } from "../components/userGroup/UserGroupMembersList";
import { UserGroupSettings } from "../components/userGroup/UserGroupSettings";
import { UserGroupMemberManagement } from "../components/userGroup/UserGroupMemberManagement";
import { useUserGroupQuery } from "../hooks/useUserGroupQuery";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { usePortoAuth } from "../contexts/PortoAuthContext";

export const UserGroupDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = usePortoAuth();
  const { data: userGroup, isLoading, error, refetch } = useUserGroupQuery(id);

  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;

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
        <ErrorMessage message={errorMessage || "Failed to load user group"} />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <Breadcrumbs
        items={[
          { label: "User Groups", path: "/user-groups" },
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
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <div className="text-sm text-gray-500">Members</div>
            <div className="text-2xl font-bold text-gray-900">{userGroup.memberCount}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Contests</div>
            <div className="text-2xl font-bold text-gray-900">{userGroup.contestCount}</div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Members</h3>
          <UserGroupMembersList
            members={userGroup.members}
            currentUserRole={userGroup.currentUserRole}
            currentUserId={user?.id}
          />
        </div>
      </div>

      {isAdmin && (
        <>
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
