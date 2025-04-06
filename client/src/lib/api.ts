const API_BASE_URL = 'http://localhost:4000/api';

export const api = {
  // Auth endpoints
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw new Error('Login failed');
    return response.json();
  },

  register: async (email: string, password: string, name: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    if (!response.ok) throw new Error('Registration failed');
    return response.json();
  },

  forgotPassword: async (email: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) throw new Error('Failed to send reset email');
    return response.json();
  },

  resetPassword: async (token: string, newPassword: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    if (!response.ok) throw new Error('Failed to reset password');
    return response.json();
  },

  verifyEmail: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) throw new Error('Failed to verify email');
    return response.json();
  },

  resendVerification: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to resend verification email');
    return response.json();
  },

  get: async (endpoint: string) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!response.ok) throw new Error('Request failed');
    return response.json();
  },

  // Team endpoints
  getTeam: async (teamId: string) => {
    const response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch team');
    return response.json();
  },

  getTeamsByLeague: async (leagueId: string) => {
    const response = await fetch(`${API_BASE_URL}/teams/league/${leagueId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch teams by league');
    return response.json();
  },

  // Hyperliquid endpoints
  getAssets: async () => {
    const response = await fetch(`${API_BASE_URL}/hyperliquid/assets`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch assets');
    return response.json();
  },

  placeOrder: async (orderData: {
    asset: string;
    amountUsdc: number;
    leverage: number;
  }) => {
    const response = await fetch(`${API_BASE_URL}/hyperliquid/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(orderData),
    });
    if (!response.ok) throw new Error('Failed to place order');
    return response.json();
  },

  // Leaderboard endpoints
  getLeaderboard: async () => {
    const response = await fetch(`${API_BASE_URL}/pga/leaderboard`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch leaderboard');
    return response.json();
  },
};
