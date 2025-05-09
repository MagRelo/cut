import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { AdminPage } from './pages/AdminPage';
import { Navigation } from './components/Navigation';
import { AuthProvider } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicLeagueList } from './pages/PublicLeagueList';
import { PublicLeagueLobby } from './pages/PublicLeagueLobby';
import { PublicCreateLeague } from './pages/PublicCreateLeague';
import { UserSettings } from './pages/UserSettings';
import { PublicSingleTeam } from './pages/PublicSingleTeam';
import { PublicLeagueLayout } from './components/layouts/PublicLeagueLayout';
// import { PublicTeamFormComponent } from 'components/team/PublicTeamFormComponent';
// import { MaintenanceOverlay } from './components/common/MaintenanceOverlay';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ChatProvider>
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
                <Route path='/reset-password' element={<ResetPassword />} />

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
      </ChatProvider>
    </AuthProvider>
  );
};
