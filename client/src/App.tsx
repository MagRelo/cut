import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { LeagueLobby } from './pages/LeagueLobby';
import { Timeline } from './pages/Timeline';
import { Leagues } from './pages/Leagues';
import { CreateLeague } from './pages/CreateLeague';
import { Order } from './pages/Order';
import { TeamForm } from './pages/TeamForm';
import { Navigation } from './components/Navigation';
import { AuthProvider } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserSettings } from './pages/UserSettings';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ChatProvider>
        <Router>
          <div className='min-h-screen bg-gray-100'>
            <Navigation />
            <Routes>
              <Route path='/' element={<Home />} />
              <Route path='/login' element={<Login />} />
              <Route path='/register' element={<Register />} />
              <Route path='/forgot-password' element={<ForgotPassword />} />
              <Route path='/reset-password' element={<ResetPassword />} />
              <Route
                path='/settings'
                element={
                  <ProtectedRoute>
                    <UserSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/order'
                element={
                  <ProtectedRoute>
                    <Order />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/leagues'
                element={
                  <ProtectedRoute>
                    <Leagues />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/leagues/new'
                element={
                  <ProtectedRoute>
                    <CreateLeague />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/league-lobby/:leagueId'
                element={
                  <ProtectedRoute>
                    <LeagueLobby />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/league/:leagueId/create-team'
                element={
                  <ProtectedRoute>
                    <TeamForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/timeline'
                element={
                  <ProtectedRoute>
                    <Timeline />
                  </ProtectedRoute>
                }
              />
              <Route
                path='/team/:teamId/edit'
                element={
                  <ProtectedRoute>
                    <TeamForm />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </Router>
      </ChatProvider>
    </AuthProvider>
  );
};
