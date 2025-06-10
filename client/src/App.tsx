import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { WagmiProvider } from 'wagmi';
import { config } from './wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { PortoAuthProvider } from './contexts/PortoAuthContext';
import { TournamentProvider } from './contexts/TournamentContext';

import { Home } from './pages/Home';
import { MyTeam } from './pages/MyTeam';
import { UserPage } from './pages/User'; //user
import { AdminPage } from './pages/AdminPage';
import { Contests } from './pages/ContestListPage';
import { ContestLobby } from './pages/ContestLobby';
import CreateContestPage from './pages/CreateContestPage';

import { TournamentInfoCard } from './components/common/TournamentInfoCard';
import { ProtectedRoute } from './components/util/ProtectedRoute';
import { Navigation } from './components/Navigation';
import { TermsOfService } from './pages/TermsOfService';
// import { MaintenanceOverlay } from './components/common/MaintenanceOverlay';

const queryClient = new QueryClient();

export const App: React.FC = () => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <PortoAuthProvider>
          <TournamentProvider>
            <Router>
              <div className='min-h-screen bg-gray-100 flex flex-col'>
                {/* TODO: Remove this when we're ready to go live */}
                {/* <MaintenanceOverlay /> */}
                <div className='flex flex-col flex-grow'>
                  <div className='container mx-auto md:py-8'>
                    <div className='max-w-2xl mx-auto'>
                      <div className='md:mb-6'>
                        <TournamentInfoCard />
                      </div>
                      <Routes>
                        <Route path='/' element={<Home />} />
                        <Route path='/terms' element={<TermsOfService />} />
                        <Route path='/contests' element={<Contests />} />
                        <Route
                          path='/contests/create'
                          element={<CreateContestPage />}
                        />
                        <Route path='/contest/:id' element={<ContestLobby />} />
                        <Route path='/user' element={<UserPage />} />

                        {/* Protected Routes */}
                        <Route
                          path='/admin'
                          element={
                            <ProtectedRoute>
                              <AdminPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path='/team'
                          element={
                            <ProtectedRoute>
                              <MyTeam />
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
          </TournamentProvider>
        </PortoAuthProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
