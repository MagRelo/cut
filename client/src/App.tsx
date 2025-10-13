import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { WagmiProvider } from "wagmi";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/queryClient";
import { config } from "./wagmi";
// import { config } from "./wagmi-base";

import { PortoAuthProvider } from "./contexts/PortoAuthContext";
import { TournamentProvider } from "./contexts/TournamentContext";
import { LineupProvider } from "./contexts/LineupContext";

import { Home } from "./pages/Home";
import { ConnectPage } from "./pages/ConnectPage";
import { UserPage } from "./pages/Account";
import { CUTInfoPage } from "./pages/AccountCUTInfoPage";
import { USDCInfoPage } from "./pages/AccountUSDCInfoPage";

import { LineupList } from "./pages/LineupListPage";
import LineupCreatePage from "./pages/LineupCreatePage";

import { Contests } from "./pages/ContestListPage";
import { ContestLobby } from "./pages/ContestLobbyPage";
import ContractsPage from "./pages/ContractsPage";

import { LeaderboardPage } from "./pages/LeaderboardPage";

import { TournamentInfoCard } from "./components/tournament/TournamentInfoCard";
import { ProtectedRoute } from "./components/common/ProtectedRoute";
import { Footer } from "./components/common/Footer";
import CreateContestPage from "./pages/ContestCreatePage";
import { TermsOfService } from "./pages/TermsOfService";
// import { MaintenanceOverlay } from './components/common/MaintenanceOverlay';

export const App: React.FC = () => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <PortoAuthProvider>
          <TournamentProvider>
            <LineupProvider>
              <Router>
                <div className="min-h-screen bg-gray-100 flex flex-col">
                  {/* TODO: Remove this when we're ready to go live */}
                  {/* <MaintenanceOverlay /> */}
                  <div className="flex flex-col flex-grow">
                    <div className="container mx-auto md:py-8">
                      <div className="max-w-2xl mx-auto">
                        <div>
                          <TournamentInfoCard />
                        </div>
                        <Routes>
                          <Route path="/" element={<Home />} />
                          <Route path="/terms" element={<TermsOfService />} />
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
                          <Route path="/contest/:id" element={<ContestLobby />} />

                          {/* Lineups */}
                          <Route path="/lineups/create" element={<LineupCreatePage />} />
                          <Route
                            path="/lineups/edit/:lineupId"
                            element={
                              <ProtectedRoute>
                                <LineupCreatePage />
                              </ProtectedRoute>
                            }
                          />
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
                        </Routes>
                      </div>
                    </div>
                  </div>
                  <Footer />
                </div>
              </Router>
            </LineupProvider>
          </TournamentProvider>
        </PortoAuthProvider>
        {/* React Query DevTools - only loads in development */}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </WagmiProvider>
  );
};
