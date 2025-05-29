import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import { TournamentProvider } from './contexts/TournamentContext';

import { Login } from './pages/user/Login';
import { Register } from './pages/user/Register';
import { ForgotPassword } from './pages/user/ForgotPassword';
import { AdminPage } from './pages/user/AdminPage';
import { UserSettings } from './pages/user/UserSettings';

import { Home } from './pages/Home';
import { PublicLeagueList } from './pages/PublicLeagueList';
import { PublicLeagueLobby } from './pages/PublicLeagueLobby';
import { PublicCreateLeague } from './pages/PublicCreateLeague';
import { PublicSingleTeam } from './pages/PublicSingleTeam';

import { PublicLeagueLayout } from './components/layouts/PublicLeagueLayout';
import { Navigation } from './components/common/Navigation';
import { ProtectedRoute } from './components/ProtectedRoute';
// import { PublicTeamFormComponent } from 'components/team/PublicTeamFormComponent';
// import { MaintenanceOverlay } from './components/common/MaintenanceOverlay';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <TournamentProvider>
        <Router>
          <div className='min-h-screen bg-gray-100 flex flex-col'>
            {/* TODO: Remove this when we're ready to go live */}
            {/* <MaintenanceOverlay /> */}
            <div className='flex flex-col flex-grow'>
              <Routes>
                <Route path='/' element={<Home />} />
                <Route path='/login' element={<Login />} />
                <Route path='/register' element={<Register />} />
                <Route path='/forgot-password' element={<ForgotPassword />} />

                {/* Public League Routes */}
                <Route element={<PublicLeagueLayout />}>
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
                  <Route path='/public/team' element={<PublicSingleTeam />} />
                </Route>

                {/* Admin Routes */}
                <Route
                  path='/admin'
                  element={
                    <ProtectedRoute>
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/settings'
                  element={
                    <ProtectedRoute>
                      <UserSettings />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </div>
            <Navigation />
          </div>
        </Router>
      </TournamentProvider>
    </AuthProvider>
  );
};
