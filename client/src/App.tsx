import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { WagmiProvider } from "@privy-io/wagmi";
import { PrivyProvider } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/queryClient";
import { config } from "./wagmi";
import { prefetchActiveTournament } from "./hooks/useTournamentData";

import { AuthProvider } from "./contexts/AuthContext";
import { useReferralCapture } from "./hooks/useReferralCapture";
import { GlobalErrorProvider } from "./contexts/GlobalErrorContext";
import {
  getSmartWalletsPaymasterConfig,
  getSmartWalletsProviderKey,
} from "./lib/privySmartWalletPaymaster";

import { Home } from "./pages/Home";
import { ConnectPage } from "./pages/ConnectPage";
import { UserPage } from "./pages/Account";
import { UserHistoryPage } from "./pages/UserHistoryPage";
import { CUTInfoPage } from "./pages/AccountCUTInfoPage";
import { USDCInfoPage } from "./pages/AccountUSDCInfoPage";
import { TransferFundsPage } from "./pages/AccountTransferFundsPage";

import { LineupList } from "./pages/LineupListPage";

import { Contests } from "./pages/ContestListPage";
import { ContestLobby } from "./pages/ContestLobbyPage";
import ContractsPage from "./pages/ContractsPage";

import { LeaderboardPage } from "./pages/LeaderboardPage";

import { TournamentHeaderPanel } from "./components/tournament/TournamentHeaderPanel";

import { ProtectedRoute } from "./components/common/ProtectedRoute";
import { OnboardingRedirectGate } from "./components/common/OnboardingRedirectGate";
import { Footer } from "./components/common/Footer";
import { GlobalLoadingOverlay } from "./components/common/GlobalLoadingOverlay";
import CreateContestPage from "./pages/ContestCreatePage";
import { TermsOfService } from "./pages/TermsOfService";
import { FAQPage } from "./pages/FAQPage";
import { AdminPage } from "./pages/AdminPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminUserDetailPage } from "./pages/admin/AdminUserDetailPage";
import { AdminRoute } from "./components/common/AdminRoute";
import { UserGroupListPage } from "./pages/UserGroupListPage";
import { UserGroupDetailPage } from "./pages/UserGroupDetailPage";
import { UserGroupCreatePage } from "./pages/UserGroupCreatePage";
import { DebugPage } from "./pages/DebugPage";
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
  return null;
}

const AppShell: React.FC = () => {
  const { isBlockingLoad } = useAppLoadingGate();

  return (
    <>
      <ReferralQueryCapture />
      <div className="min-h-dvh bg-gray-100 flex flex-col">
        {/* TODO: Remove this when we're ready to go live */}
        {/* <MaintenanceOverlay /> */}
        <main className="flex-1 min-h-0">
          <div className="container mx-auto">
            <OnboardingRedirectGate>
              <div className="max-w-2xl mx-auto">
                <TournamentHeaderPanel />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/faq" element={<FAQPage />} />
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
                    element={
                      <ProtectedRoute>
                        <UserPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/account/history"
                    element={
                      <ProtectedRoute>
                        <UserHistoryPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/account/funds"
                    element={
                      <ProtectedRoute>
                        <TransferFundsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/usdc" element={<USDCInfoPage />} />
                  <Route path="/cut" element={<CUTInfoPage />} />

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

                  {/* Lineups */}
                  <Route
                    path="/lineups"
                    element={
                      <ProtectedRoute>
                        <LineupList />
                      </ProtectedRoute>
                    }
                  />

                  {/* Leaderboard */}
                  <Route path="/leaderboard" element={<LeaderboardPage />} />

                  {/* User Groups */}
                  <Route
                    path="/user-groups"
                    element={
                      <ProtectedRoute>
                        <UserGroupListPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/user-groups/create"
                    element={
                      <ProtectedRoute>
                        <UserGroupCreatePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/user-groups/:id"
                    element={
                      <ProtectedRoute>
                        <UserGroupDetailPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin (staff only; not linked in global nav) */}
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

                  {/* Debug */}
                  <Route path="/debug" element={<DebugPage />} />
                </Routes>
              </div>
            </OnboardingRedirectGate>
          </div>
        </main>
        <Footer />
      </div>
      <GlobalLoadingOverlay isBlocking={isBlockingLoad} />
    </>
  );
};

export const App: React.FC = () => {
  // Prefetch tournament data on app initialization for faster page loads
  // This runs in the background and caches data before components mount
  useEffect(() => {
    void prefetchActiveTournament(queryClient);
  }, []);

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
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </SmartWalletsProvider>
    </PrivyProvider>
  );
};
