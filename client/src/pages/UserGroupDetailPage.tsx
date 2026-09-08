import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tab, TabGroup, TabList, TabPanel } from "@headlessui/react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { PageSection } from "../components/layout/PageSection";
import { UserGroupSettings } from "../components/userGroup/UserGroupSettings";
import { UserGroupMemberManagement } from "../components/userGroup/UserGroupMemberManagement";
import { UserGroupInvitePanel } from "../components/userGroup/UserGroupInvitePanel";
import { ContestDirectorySections } from "../components/contest/ContestDirectorySections";
import {
  leagueCreateContestPath,
  overlayLeagueContestsOnDirectory,
} from "../lib/contestGroups";
import { useContestDirectory } from "../hooks/useContestDirectory";
import { useUserGroupQuery, useUserGroupContestsQuery } from "../hooks/useUserGroupQuery";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { isApiError } from "../utils/apiError";
import { tabButtonClassName, tabListClassName } from "../lib/tabStyles";

export const UserGroupDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { data: userGroup, isLoading, error, refetch } = useUserGroupQuery(id);
  const {
    data: leagueContests,
    isLoading: isContestsLoading,
    error: contestsError,
  } = useUserGroupContestsQuery(id);
  const { data: directory, isLoading: isDirectoryLoading, error: directoryError } =
    useContestDirectory("all");

  const errorMessage =
    error && isApiError(error) && error.statusCode === 404
      ? "League not found"
      : error instanceof Error
        ? error.message
        : error
          ? String(error)
          : null;

  const contestsErrorMessage =
    contestsError instanceof Error
      ? contestsError.message
      : directoryError instanceof Error
        ? directoryError.message
        : null;

  const directorySections = useMemo(
    () => overlayLeagueContestsOnDirectory(directory, leagueContests ?? []),
    [directory, leagueContests],
  );

  const isAdmin = userGroup?.currentUserRole === "ADMIN";

  const handleDeleted = () => {
    navigate("/leagues");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !userGroup) {
    return <ErrorMessage message={errorMessage || "Failed to load league"} />;
  }

  const showInitialLoading = (isDirectoryLoading && !directory) || (isContestsLoading && !leagueContests);

  const contestContent = showInitialLoading ? (
    <div className="min-h-[80px] py-8 text-center">
      <p className="mb-4 font-display font-semibold text-gray-400">Loading Events</p>
      <LoadingSpinner />
    </div>
  ) : (
    <ContestDirectorySections
      upcoming={directorySections.upcoming}
      live={directorySections.live}
      past={directorySections.past}
      error={contestsErrorMessage}
      createContestToForEvent={
        isAdmin
          ? (event) => leagueCreateContestPath(userGroup.id, event.id)
          : undefined
      }
    />
  );

  const membersContent = (
    <div className="space-y-5">
      <UserGroupInvitePanel
        userGroupId={userGroup.id}
        inviteCode={userGroup.inviteCode}
        inviteUrl={userGroup.inviteUrl}
        onInviteUpdated={() => refetch()}
      />
      <PageSection variant="card">
        <UserGroupMemberManagement
          userGroupId={userGroup.id}
          members={userGroup.members}
          onMemberAdded={() => refetch()}
          onMemberRemoved={() => refetch()}
        />
      </PageSection>
    </div>
  );

  const settingsContent = (
    <PageSection variant="card">
      <UserGroupSettings
        userGroupId={userGroup.id}
        initialData={{
          name: userGroup.name,
          description: userGroup.description,
        }}
        onUpdated={() => refetch()}
        onDeleted={handleDeleted}
      />
    </PageSection>
  );

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Leagues", path: "/leagues" },
          { label: userGroup.name, path: `/leagues/${id}` },
        ]}
      />

      <PageSection variant="default" className="overflow-hidden !border-b-0 !p-0 !pb-0">
        <header className="px-2 pb-4 pt-2">
          <div>
            <h1 className="mb-1 font-display text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl">
              {userGroup.name}
            </h1>
            {userGroup.description ? (
              <p className="max-w-prose whitespace-pre-wrap font-display text-sm leading-relaxed text-gray-600 sm:text-base">
                {userGroup.description}
              </p>
            ) : null}
          </div>
        </header>

        <TabGroup selectedIndex={selectedIndex} onChange={setSelectedIndex}>
          <div className="px-2">
            <TabList className={tabListClassName()}>
              <Tab className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}>
                Contests
              </Tab>
              {isAdmin ? (
                <>
                  <Tab
                    className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}
                  >
                    Members
                  </Tab>
                  <Tab
                    className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}
                  >
                    Settings
                  </Tab>
                </>
              ) : null}
            </TabList>
          </div>
          <div className="px-2 py-4">
            <TabPanel className="focus:outline-none">{contestContent}</TabPanel>
            {isAdmin ? (
              <>
                <TabPanel className="focus:outline-none">{membersContent}</TabPanel>
                <TabPanel className="focus:outline-none">{settingsContent}</TabPanel>
              </>
            ) : null}
          </div>
        </TabGroup>
      </PageSection>
    </>
  );
};
