import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import { WagmiProvider } from "@privy-io/wagmi";
import { PrivyProvider } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { QueryClientProvider } from "@tanstack/react-query";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/queryClient";
import { config } from "./wagmi";

import { AuthProvider } from "./contexts/AuthContext";
import { useReferralCapture } from "./hooks/useReferralCapture";
import { useLeagueInviteCapture } from "./hooks/useLeagueInviteCapture";
import { GlobalErrorProvider } from "./contexts/GlobalErrorContext";
import {
  getSmartWalletsPaymasterConfig,
  getSmartWalletsProviderKey,
} from "./lib/privySmartWalletPaymaster";

import { Home } from "./pages/Home";
import { ConnectPage } from "./pages/ConnectPage";
import { SettingsPage } from "./pages/account/SettingsPage";
import { ActivityPage } from "./pages/account/ActivityPage";
import { ReferralsPage } from "./pages/account/ReferralsPage";
import { WalletPage } from "./pages/account/WalletPage";

import { ContestLobby } from "./pages/ContestLobbyPage";
import { Contests } from "./pages/ContestListPage";
import {
  ActiveEventLeaderboardRedirect,
  SportContestRedirect,
  UserGroupToLeagueRedirect,
} from "./components/routing/LegacyRedirects";
import ContractsPage from "./pages/ContractsPage";

import { LeaderboardPage } from "./pages/LeaderboardPage";

import { AppLayout } from "./components/layout/AppLayout";

import { ProtectedRoute } from "./components/common/ProtectedRoute";
import { OnboardingRedirectGate } from "./components/common/OnboardingRedirectGate";
import { GlobalLoadingOverlay } from "./components/common/GlobalLoadingOverlay";
import CreateContestPage from "./pages/ContestCreatePage";
import { TermsOfService } from "./pages/TermsOfService";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { ResponsibleGaming } from "./pages/ResponsibleGaming";
import { Disclosures } from "./pages/Disclosures";
import { FAQPage } from "./pages/FAQPage";
import { LeagueStarterGuidePage } from "./pages/LeagueStarterGuidePage";
import { AdminPage } from "./pages/AdminPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminUserDetailPage } from "./pages/admin/AdminUserDetailPage";
import { AdminRoute } from "./components/common/AdminRoute";
import { UserGroupListPage } from "./pages/UserGroupListPage";
import { UserGroupDetailPage } from "./pages/UserGroupDetailPage";
import { UserGroupCreatePage } from "./pages/UserGroupCreatePage";
import { UserGroupCreateContestPage } from "./pages/UserGroupCreateContestPage";
import { UserGroupJoinPage } from "./pages/UserGroupJoinPage";
import { DebugPage } from "./pages/DebugPage";
import { CommodityIconPreviewPage } from "./pages/dev/CommodityIconPreviewPage";
import { CommodityAvatarVariantPreviewPage } from "./pages/dev/CommodityAvatarVariantPreviewPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { useAppLoadingGate } from "./hooks/useAppLoadingGate";
// import { MaintenanceOverlay } from './components/common/MaintenanceOverlay';

const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;
if (!privyAppId && import.meta.env.DEV) {
  console.warn("VITE_PRIVY_APP_ID is not set");
}

const smartWalletsPaymasterConfig = getSmartWalletsPaymasterConfig();
const smartWalletsProviderKey = getSmartWalletsProviderKey();

function ReferralQueryCapture() {
  useReferralCapture();
  useLeagueInviteCapture();
  return null;
}

const AppShell: React.FC = () => {
  const { isBlockingLoad } = useAppLoadingGate();

  return (
    <>
      <ReferralQueryCapture />
      <AppLayout>
        {/* TODO: Remove this when we're ready to go live */}
        {/* <MaintenanceOverlay /> */}
        <OnboardingRedirectGate>
          <Routes>
            <Route path="/" element={<Navigate to="/contests" replace />} />
            <Route path="/sports/:sportId" element={<Navigate to="/contests" replace />} />
            <Route path="/sports/:sportId/events/:eventId/leaderboard" element={<LeaderboardPage />} />
            <Route path="/sports/:sportId/leaderboard" element={<ActiveEventLeaderboardRedirect />} />
            <Route path="/sports/:sportId/contests/:id" element={<SportContestRedirect />} />
            <Route path="/home" element={<Home />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/responsible-gaming" element={<ResponsibleGaming />} />
            <Route path="/disclosures" element={<Disclosures />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/guides/start-a-league" element={<LeagueStarterGuidePage />} />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />
            <Route path="/connect" element={<ConnectPage />} />
            <Route path="/contracts" element={<ContractsPage />} />
            <Route
              path="/account"
              element={<Navigate to="/account/settings" replace />}
            />
            <Route
              path="/account/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account/history"
              element={<Navigate to="/account/activity" replace />}
            />
            <Route
              path="/account/activity"
              element={
                <ProtectedRoute>
                  <ActivityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account/referrals"
              element={
                <ProtectedRoute>
                  <ReferralsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account/funds"
              element={
                <ProtectedRoute>
                  <WalletPage />
                </ProtectedRoute>
              }
            />
            {/* Contests */}
            <Route path="/contests" element={<Contests />} />
            <Route
              path="/contests/create"
              element={
                <ProtectedRoute>
                  <CreateContestPage />
                </ProtectedRoute>
              }
            />
            <Route path="/contest/:address" element={<ContestLobby />} />

            {/* Leagues (canonical) */}
            <Route
              path="/leagues"
              element={
                <ProtectedRoute>
                  <UserGroupListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leagues/create"
              element={
                <ProtectedRoute>
                  <UserGroupCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leagues/join/:code"
              element={
                <ProtectedRoute>
                  <UserGroupJoinPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leagues/:id/contests/create"
              element={
                <ProtectedRoute>
                  <UserGroupCreateContestPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leagues/:id"
              element={
                <ProtectedRoute>
                  <UserGroupDetailPage />
                </ProtectedRoute>
              }
            />
            {/* Legacy user-group URLs */}
            <Route path="/user-groups" element={<Navigate to="/leagues" replace />} />
            <Route path="/user-groups/create" element={<Navigate to="/leagues/create" replace />} />
            <Route path="/user-groups/join/:code" element={<UserGroupToLeagueRedirect />} />
            <Route path="/user-groups/:id" element={<UserGroupToLeagueRedirect />} />

            {/* Admin (staff only; linked in nav when user is ADMIN / SUPER_ADMIN) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminPage />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminUsersPage />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users/:userId"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <AdminUserDetailPage />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />

            {import.meta.env.DEV && (
              <>
                <Route path="/debug" element={<DebugPage />} />
                <Route path="/dev/commodity-icons" element={<CommodityIconPreviewPage />} />
                <Route path="/dev/commodity-avatar-variants" element={<CommodityAvatarVariantPreviewPage />} />
              </>
            )}
          </Routes>
        </OnboardingRedirectGate>
      </AppLayout>
      <GlobalLoadingOverlay isBlocking={isBlockingLoad} />
    </>
  );
};

export const App: React.FC = () => {
  return (
    <PrivyProvider appId={privyAppId ?? ""}>
      <SmartWalletsProvider key={smartWalletsProviderKey} config={smartWalletsPaymasterConfig}>
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={config}>
            <GlobalErrorProvider>
              <AuthProvider>
                <Router>
                  <AppShell />
                </Router>
              </AuthProvider>
            </GlobalErrorProvider>
          </WagmiProvider>
          {/* React Query DevTools - only loads in development */}
          {/* <ReactQueryDevtools initialIsOpen={false} /> */}
        </QueryClientProvider>
      </SmartWalletsProvider>
    </PrivyProvider>
  );
};
