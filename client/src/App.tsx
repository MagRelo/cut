import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { WagmiProvider } from 'wagmi';
import { config } from './wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { PortoAuthProvider } from './contexts/PortoAuthContext';
import { TournamentProvider } from './contexts/TournamentContext';

import { AdminPage } from './pages/AdminPage';
import { UserPage } from './pages/UserPage';
import { TermsOfService } from './pages/TermsOfService';
import { PortoPage } from './pages/PortoPage';

import { Home } from './pages/Home';
import { PublicLeagueList } from './pages/PublicLeagueList';
import { PublicLeagueLobby } from './pages/PublicLeagueLobby';
import { PublicCreateLeague } from './pages/PublicCreateLeague';
import { PublicSingleTeam } from './pages/PublicSingleTeam';

import { Navigation } from './components/Navigation';
import { ProtectedRoute } from './components/util/ProtectedRoute';
import { TournamentInfoCard } from './components/common/TournamentInfoCard';
// import { PublicTeamFormComponent } from 'components/team/PublicTeamFormComponent';
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
                        <Route path='/user' element={<UserPage />} />
                        <Route path='/porto' element={<PortoPage />} />

                        {/* Public League Routes */}
                        <Route
                          path='/public/leagues'
                          element={<PublicLeagueList />}
                        />
                        <Route
                          path='/public/leagues/new'
                          element={<PublicCreateLeague />}
                        />
                        <Route
                          path='/public/league/:leagueId'
                          element={<PublicLeagueLobby />}
                        />
                        <Route
                          path='/public/team'
                          element={<PublicSingleTeam />}
                        />

                        {/* Protected Routes */}
                        <Route
                          path='/admin'
                          element={
                            <ProtectedRoute>
                              <AdminPage />
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
