import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tab, TabGroup, TabList, TabPanel } from "@headlessui/react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { PageSection } from "../components/layout/PageSection";
import { UserGroupMembersList } from "../components/userGroup/UserGroupMembersList";
import { UserGroupSettings } from "../components/userGroup/UserGroupSettings";
import { UserGroupMemberManagement } from "../components/userGroup/UserGroupMemberManagement";
import { UserGroupInvitePanel } from "../components/userGroup/UserGroupInvitePanel";
import { LeagueCreateContestForm } from "../components/userGroup/LeagueCreateContestForm";
import { ContestList } from "../components/contest/ContestList";
import { useUserGroupQuery } from "../hooks/useUserGroupQuery";
import { useContestsQuery } from "../hooks/useContestQuery";
import { useActiveTournament } from "../hooks/useTournamentData";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { useAuth } from "../contexts/AuthContext";
import { isApiError } from "../utils/apiError";
import { tabButtonClassName, tabListClassName } from "../lib/tabStyles";

export const UserGroupDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedIndex, setSelectedIndex] = useState(0);
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

  const contestsErrorMessage = contestsError instanceof Error ? contestsError.message : null;

  const isAdmin = userGroup?.currentUserRole === "ADMIN";

  const handleDeleted = () => {
    navigate("/user-groups");
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

  const overviewContent = (
    <div className="space-y-4">
      <header className="space-y-1.5 border-b border-gray-200 pb-2">
        <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl">
          {userGroup.name}
        </h1>
        {userGroup.description ? (
          <p className="max-w-prose whitespace-pre-wrap font-display text-sm leading-relaxed text-gray-600 sm:text-base">
            {userGroup.description}
          </p>
        ) : null}
      </header>

      <div>
        <div className="text-sm text-gray-500">Members</div>
        <div className="text-2xl font-bold text-gray-900">{userGroup.memberCount}</div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Contests</h3>
        <ContestList
          contests={leagueContests ?? []}
          loading={isContestsLoading}
          error={contestsErrorMessage}
        />
      </div>
    </div>
  );

  const membersContent = (
    <UserGroupMembersList members={userGroup.members} currentUserId={user?.id} />
  );

  const manageContent = (
    <div className="-m-4 bg-gray-100 p-4">
      <div className="space-y-5">
        <PageSection variant="card">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Create contest</h3>
          <LeagueCreateContestForm
            userGroupId={userGroup.id}
            userGroupName={userGroup.name}
            onContestCreated={() => void refetch()}
          />
        </PageSection>

        <PageSection variant="card">
          <UserGroupInvitePanel
            userGroupId={userGroup.id}
            inviteCode={userGroup.inviteCode}
            inviteUrl={userGroup.inviteUrl}
            onInviteUpdated={() => refetch()}
          />
        </PageSection>

        <PageSection variant="card">
          <UserGroupMemberManagement
            userGroupId={userGroup.id}
            members={userGroup.members}
            onMemberAdded={() => refetch()}
            onMemberRemoved={() => refetch()}
          />
        </PageSection>

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
      </div>
    </div>
  );

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "My Leagues", path: "/user-groups" },
          { label: userGroup.name, path: `/user-groups/${id}` },
        ]}
      />

      <PageSection variant="card" className="overflow-hidden !p-0">
        <TabGroup selectedIndex={selectedIndex} onChange={setSelectedIndex}>
          <TabList className={tabListClassName("space-x-1", "px-4", "pt-2")}>
            <Tab className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}>
              Overview
            </Tab>
            <Tab className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}>
              Members
            </Tab>
            {isAdmin ? (
              <Tab
                className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}
              >
                Manage
              </Tab>
            ) : null}
          </TabList>
          <div className="px-4 py-4">
            <TabPanel className="focus:outline-none">{overviewContent}</TabPanel>
            <TabPanel className="focus:outline-none">{membersContent}</TabPanel>
            {isAdmin ? <TabPanel className="focus:outline-none">{manageContent}</TabPanel> : null}
          </div>
        </TabGroup>
      </PageSection>
    </>
  );
};
