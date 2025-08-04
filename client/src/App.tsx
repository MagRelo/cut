import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "./wagmi";
// import { config } from "./wagmi-base";

import { PortoAuthProvider } from "./contexts/PortoAuthContext";
import { TournamentProvider } from "./contexts/TournamentContext";
import { LineupProvider } from "./contexts/LineupContext";

import { Home } from "./pages/Home";
import { UserPage } from "./pages/User";
import { TreasuryPage } from "./pages/Treasury";
import { AddPage } from "./pages/AddPage";
import { SellPage } from "./pages/SellPage";
import { TransferPage } from "./pages/TransferPage";

import { LineupList } from "./pages/LineupList";
import LineupCreatePage from "./pages/LineupCreatePage";

import { Contests } from "./pages/ContestListPage";
import { ContestLobby } from "./pages/ContestLobby";
import CreateContestPage from "./pages/ContestCreatePage";

import { TournamentInfoCard } from "./components/common/TournamentInfoCard";
import { ProtectedRoute } from "./components/util/ProtectedRoute";
import { Navigation } from "./components/Navigation";
import { TermsOfService } from "./pages/TermsOfService";
// import { MaintenanceOverlay } from './components/common/MaintenanceOverlay';

const queryClient = new QueryClient();

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
                        <div className="md:mb-6">
                          <TournamentInfoCard />
                        </div>
                        <Routes>
                          <Route path="/" element={<Home />} />
                          <Route path="/terms" element={<TermsOfService />} />
                          <Route path="/user" element={<UserPage />} />
                          <Route
                            path="/treasury"
                            element={
                              <ProtectedRoute>
                                <TreasuryPage />
                              </ProtectedRoute>
                            }
                          />

                          {/* Treasury Operations */}
                          <Route
                            path="/add"
                            element={
                              <ProtectedRoute>
                                <AddPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/sell"
                            element={
                              <ProtectedRoute>
                                <SellPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/transfer"
                            element={
                              <ProtectedRoute>
                                <TransferPage />
                              </ProtectedRoute>
                            }
                          />

                          {/* Contests */}
                          <Route
                            path="/contests"
                            element={
                              <ProtectedRoute>
                                <Contests />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/contests/create"
                            element={
                              <ProtectedRoute>
                                <CreateContestPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/contest/:id"
                            element={
                              <ProtectedRoute>
                                <ContestLobby />
                              </ProtectedRoute>
                            }
                          />

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
                        </Routes>
                      </div>
                    </div>
                  </div>
                  <Navigation />
                </div>
              </Router>
            </LineupProvider>
          </TournamentProvider>
        </PortoAuthProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
