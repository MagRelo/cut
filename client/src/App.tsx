import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { VerifyEmail } from './pages/VerifyEmail';
import { Tournament } from './pages/Tournament';
import { Timeline } from './pages/Timeline';
import { Leagues } from './pages/Leagues';
import { Order } from './pages/Order';
import ManageTeam from './pages/ManageTeam';
import { Navigation } from './components/Navigation';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className='min-h-screen bg-gray-100'>
          <Navigation />
          <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/login' element={<Login />} />
            <Route path='/register' element={<Register />} />
            <Route path='/forgot-password' element={<ForgotPassword />} />
            <Route path='/reset-password' element={<ResetPassword />} />
            <Route path='/verify-email' element={<VerifyEmail />} />
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
              path='/tournament/:leagueId'
              element={
                <ProtectedRoute>
                  <Tournament />
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
              path='/manage/:teamId'
              element={
                <ProtectedRoute>
                  <ManageTeam />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};
