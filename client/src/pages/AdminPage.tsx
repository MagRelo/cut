import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tab, TabGroup, TabList, TabPanel } from "@headlessui/react";
import { useQueryClient } from "@tanstack/react-query";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { AdminContestsPanel } from "../components/admin/AdminContestsPanel";
import { AdminEventsTable } from "../components/admin/AdminEventsTable";
import { AdminLeaguesTable } from "../components/admin/AdminLeaguesTable";
import { AdminStatCard } from "../components/admin/AdminStatCard";
import { AdminUsersList } from "../components/admin/AdminUsersList";
import { useAdminDashboardQuery } from "../hooks/useAdminDashboard";
import {
  ADMIN_DASHBOARD_TABS,
  adminDashboardTabIndex,
  parseAdminDashboardTab,
  type AdminDashboardTab,
} from "../lib/adminDashboardTabs";
import { tabButtonClassName, tabListClassName } from "../lib/tabStyles";
import { queryKeys } from "../utils/queryKeys";

function formatUsd(amount: number): string {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function contestsHint(count: number): string {
  return `${count.toLocaleString()} contest${count === 1 ? "" : "s"}`;
}

const TAB_LABELS: Record<AdminDashboardTab, string> = {
  users: "Users",
  events: "Events",
  contests: "Contests",
  leagues: "Leagues",
};

export const AdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = useMemo(
    () => parseAdminDashboardTab(searchParams.toString()),
    [searchParams],
  );
  const [selectedIndex, setSelectedIndex] = useState(() => adminDashboardTabIndex(tab));
  const dashboardQuery = useAdminDashboardQuery();

  useEffect(() => {
    setSelectedIndex(adminDashboardTabIndex(tab));
  }, [tab]);

  const setTab = useCallback(
    (next: AdminDashboardTab) => {
      setSearchParams({ tab: next }, { replace: true });
    },
    [setSearchParams],
  );

  const refreshAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
  }, [queryClient]);

  const dashboard = dashboardQuery.data;
  const loading = dashboardQuery.isLoading;
  const error =
    dashboardQuery.error instanceof Error
      ? dashboardQuery.error.message
      : dashboardQuery.error
        ? String(dashboardQuery.error)
        : null;

  const stats = dashboard?.stats;
  const headerActions = (
    <button
      type="button"
      onClick={refreshAll}
      disabled={dashboardQuery.isFetching}
      className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50 disabled:opacity-50"
    >
      {dashboardQuery.isFetching ? "Refreshing…" : "Refresh"}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 mb-3">
        <h1 className="m-0 text-xl font-semibold text-gray-900">Admin</h1>
        {headerActions}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <ErrorMessage message={error} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                {
                  tab: "users" as const,
                  label: "Users",
                  value: (stats?.userCount ?? 0).toLocaleString(),
                  hint: `${(stats?.newUsersThisWeek ?? 0).toLocaleString()} new this week`,
                  variant: "info" as const,
                },
                {
                  tab: "events" as const,
                  label: "Live events",
                  value: stats?.liveEventCount ?? 0,
                  hint: contestsHint(stats?.liveContestCount ?? 0),
                },
                {
                  tab: "contests" as const,
                  label: "Live contests",
                  value: stats?.liveContestCount ?? 0,
                  hint: `$${formatUsd(stats?.liveContestCash ?? 0)} primary`,
                },
                {
                  tab: "leagues" as const,
                  label: "Leagues",
                  value: stats?.leagueCount ?? 0,
                  hint: contestsHint(stats?.liveLeagueContestCount ?? 0),
                },
              ] as const
            ).map((card) => (
              <button
                key={card.tab}
                type="button"
                onClick={() => setTab(card.tab)}
                className="text-left rounded-sm"
              >
                <AdminStatCard
                  label={card.label}
                  value={card.value}
                  hint={"hint" in card ? card.hint : undefined}
                  variant={"variant" in card ? card.variant : undefined}
                />
              </button>
            ))}
          </div>

          <TabGroup
            selectedIndex={selectedIndex}
            onChange={(index) => setTab(ADMIN_DASHBOARD_TABS[index] ?? "users")}
          >
            <TabList className={tabListClassName()}>
              {ADMIN_DASHBOARD_TABS.map((id) => (
                <Tab
                  key={id}
                  className={({ selected }: { selected: boolean }) => tabButtonClassName(selected)}
                >
                  {TAB_LABELS[id]}
                </Tab>
              ))}
            </TabList>
            <div className="pt-4">
              <TabPanel className="focus:outline-none">
                <AdminUsersList />
              </TabPanel>
              <TabPanel className="focus:outline-none">
                <AdminEventsTable
                  events={dashboard?.events ?? []}
                  contests={dashboard?.contests.items ?? []}
                />
              </TabPanel>
              <TabPanel className="focus:outline-none">
                <AdminContestsPanel
                  contests={dashboard?.contests}
                  onActionComplete={refreshAll}
                />
              </TabPanel>
              <TabPanel className="focus:outline-none">
                <AdminLeaguesTable leagues={dashboard?.leagues ?? []} />
              </TabPanel>
            </div>
          </TabGroup>
        </>
      )}
    </div>
  );
};

export default AdminPage;
