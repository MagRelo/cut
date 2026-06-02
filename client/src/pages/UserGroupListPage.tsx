import { Link } from "react-router-dom";
import { PageHeader } from "../components/common/PageHeader";
import { PageSection } from "../components/layout/PageSection";
import { UserGroupList } from "../components/userGroup/UserGroupList";
import { useUserGroupsQuery } from "../hooks/useUserGroupQuery";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";

export const UserGroupListPage = () => {
  const { data, isLoading, error } = useUserGroupsQuery();

  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;

  return (
    <>
      <div className="flex items-center justify-between">
        <PageHeader title="My Leagues" />
        <Link
          to="/user-groups/create"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Create League
        </Link>
      </div>
      <PageSection>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <ErrorMessage message={errorMessage || "Failed to load leagues"} />
        ) : (
          <UserGroupList userGroups={data?.userGroups} loading={isLoading} error={errorMessage} />
        )}
      </PageSection>
    </>
  );
};
