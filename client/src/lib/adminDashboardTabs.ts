export const ADMIN_DASHBOARD_TABS = ["users", "events", "contests", "leagues", "wallets"] as const;

export type AdminDashboardTab = (typeof ADMIN_DASHBOARD_TABS)[number];

export function parseAdminDashboardTab(search: string): AdminDashboardTab {
  const raw = new URLSearchParams(search).get("tab")?.trim().toLowerCase();
  return ADMIN_DASHBOARD_TABS.includes(raw as AdminDashboardTab)
    ? (raw as AdminDashboardTab)
    : "users";
}

export function adminDashboardTabIndex(tab: AdminDashboardTab): number {
  return ADMIN_DASHBOARD_TABS.indexOf(tab);
}
