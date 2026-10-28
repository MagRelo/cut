import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tab, TabGroup, TabList, TabPanel } from "@headlessui/react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { Modal } from "../components/common/Modal";
import { PageSection } from "../components/layout/PageSection";
import { UserGroupSettings } from "../components/userGroup/UserGroupSettings";
import { UserGroupMemberManagement } from "../components/userGroup/UserGroupMemberManagement";
import { UserGroupInvitePanel } from "../components/userGroup/UserGroupInvitePanel";
import { ContestDirectorySections } from "../components/contest/ContestDirectorySections";
import { LoadingSpinnerSmall } from "../components/common/LoadingSpinnerSmall";
import { leagueCreateContestPath, overlayLeagueContestsOnDirectory } from "../lib/contestGroups";
import { useContestDirectory } from "../hooks/useContestDirectory";
import { useDeleteLeagueContest } from "../hooks/useContestMutations";
import { useUserGroupQuery, useUserGroupContestsQuery } from "../hooks/useUserGroupQuery";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { isApiError } from "../utils/apiError";
import { tabButtonClassName, tabListClassName } from "../lib/tabStyles";
import type { Contest } from "../types/contest";

export const UserGroupDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [contestToDelete, setContestToDelete] = useState<Contest | null>(null);
  const deleteContest = useDeleteLeagueContest(id ?? "");
  const { data: userGroup, isLoading, error, refetch } = useUserGroupQuery(id);
  const {
    data: leagueContests,
    isLoading: isContestsLoading,
    error: contestsError,
  } = useUserGroupContestsQuery(id);
  const {
    data: directory,
    isLoading: isDirectoryLoading,
    error: directoryError,
  } = useContestDirectory("all");

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

  const requestDeleteContest = (contest: Contest) => {
    deleteContest.reset();
    setContestToDelete(contest);
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

  const showInitialLoading =
    (isDirectoryLoading && !directory) || (isContestsLoading && !leagueContests);

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
        isAdmin ? (event) => leagueCreateContestPath(userGroup.id, event.id) : undefined
      }
      onDeleteContest={isAdmin ? requestDeleteContest : undefined}
    />
  );

  const membersContent = (
    <div className="space-y-5">
      <UserGroupInvitePanel
        userGroupId={userGroup.id}
        leagueName={userGroup.name}
        inviteCode={userGroup.inviteCode}
        inviteUrl={userGroup.inviteUrl}
        onInviteUpdated={() => refetch()}
      />
      <PageSection variant="card">
        <UserGroupMemberManagement
          userGroupId={userGroup.id}
          members={userGroup.members}
          onMemberRemoved={() => refetch()}
        />
      </PageSection>
    </div>
  );

  const settingsContent = (
    <PageSection variant="card" className="!rounded-t-none !border-t-0">
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

      <PageSection variant="card">
        <h1 className="mb-1 font-display text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl">
          {userGroup.name}
        </h1>
        {userGroup.description ? (
          <p className="max-w-prose whitespace-pre-wrap font-display text-sm leading-relaxed text-gray-600 sm:text-base">
            {userGroup.description}
          </p>
        ) : null}
      </PageSection>

      {isAdmin ? (
        <TabGroup selectedIndex={selectedIndex} onChange={setSelectedIndex} className="pt-2">
          <TabList
            className={tabListClassName("!rounded-b-none border-x border-t border-gray-200")}
          >
            <Tab className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}>
              Contests
            </Tab>
            <Tab className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}>
              Invite players
            </Tab>
            <Tab className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}>
              Settings
            </Tab>
          </TabList>
          <TabPanel className="pt-4 focus:outline-none">{contestContent}</TabPanel>
          <TabPanel className="focus:outline-none">{membersContent}</TabPanel>
          <TabPanel className="focus:outline-none">{settingsContent}</TabPanel>
        </TabGroup>
      ) : (
        <div className="pt-4">{contestContent}</div>
      )}

      <Modal
        isOpen={contestToDelete != null}
        onClose={() => {
          if (deleteContest.isPending) return;
          deleteContest.reset();
          setContestToDelete(null);
        }}
        title="Delete Contest"
        maxWidth="md"
      >
        <div className="space-y-4 p-4">
          {deleteContest.error ? (
            <ErrorMessage
              message={
                deleteContest.error instanceof Error
                  ? deleteContest.error.message
                  : "Failed to delete contest"
              }
            />
          ) : null}

          <p className="font-display text-sm leading-relaxed text-gray-700">
            This contest will be removed from the league. This cannot be undone.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                deleteContest.reset();
                setContestToDelete(null);
              }}
              disabled={deleteContest.isPending}
              className="inline-flex min-w-[120px] items-center justify-center rounded border border-gray-300 bg-white px-4 py-1.5 font-display text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (!contestToDelete) return;
                deleteContest.mutate(contestToDelete.id, {
                  onSuccess: () => setContestToDelete(null),
                });
              }}
              disabled={deleteContest.isPending}
              className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded border border-red-600 bg-red-600 px-4 py-1.5 font-display text-sm text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleteContest.isPending ? <LoadingSpinnerSmall /> : null}
              {deleteContest.isPending ? "Deleting..." : "Delete Contest"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
