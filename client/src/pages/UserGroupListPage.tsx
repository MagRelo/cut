import { PlusIcon } from "@heroicons/react/24/outline";
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

  const showFooter = !isLoading && !error;

  return (
    <>
      <PageHeader title="My Leagues" />
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
      {showFooter ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="font-display text-sm text-gray-600">
            Thinking about starting a league?{" "}
            <Link to="/guides/start-a-league" className="text-blue-600 hover:text-blue-700">
              Read the guide
            </Link>
          </p>
          <Link
            to="/leagues/create"
            className="inline-flex items-center justify-center gap-1 rounded border border-blue-500 bg-blue-500 px-3 py-2 font-display text-sm text-white transition-colors hover:bg-blue-600"
          >
            <PlusIcon className="h-4 w-4 shrink-0" aria-hidden />
            Create League
          </Link>
        </div>
      ) : null}
    </>
  );
};
