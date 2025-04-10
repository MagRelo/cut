import { StreamChat, Channel, Message, ChannelState } from 'stream-chat';
import { api } from './api';

const STREAM_API_KEY = import.meta.env.VITE_GETSTREAM_API_KEY;

if (!STREAM_API_KEY) {
  throw new Error('VITE_GETSTREAM_API_KEY is not set in environment variables');
}

// Initialize the Stream Chat client with proper options
export const streamClient = StreamChat.getInstance(STREAM_API_KEY, {
  enableWSFallback: true, // Enable XHR fallback if WebSocket fails
  timeout: 6000,
});

export interface ChannelResponse {
  channel: {
    id: string;
    type: string;
    cid: string;
  };
  state: ChannelState;
}

export interface MessagesResponse {
  messages: Message[];
  channel: Channel;
}

interface ApiConfig {
  baseURL: string;
  headers: Record<string, string>;
}

class ChatService {
  private config: ApiConfig;

  constructor() {
    this.config = {
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
      headers: {},
    };
    this.setAuthToken(localStorage.getItem('token'));
  }

  private setAuthToken(token: string | null) {
    if (token) {
      this.config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete this.config.headers.Authorization;
    }
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: unknown
  ): Promise<T> {
    const token = localStorage.getItem('token');
    this.setAuthToken(token);

    const response = await fetch(`${this.config.baseURL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        throw new Error('Authentication failed');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async connectUser(userId: string, userToken: string) {
    try {
      // If already connected as this user, don't reconnect
      if (
        streamClient.userID === userId &&
        streamClient.tokenManager.token === userToken
      ) {
        return;
      }

      // Disconnect any existing user first
      if (streamClient.userID) {
        await this.disconnectUser();
      }

      // Connect the new user
      await streamClient.connectUser(
        {
          id: userId,
          // Add any additional user data here if needed
        },
        userToken
      );
    } catch (error) {
      console.error('Error connecting to Stream:', error);
      throw error;
    }
  }

  async disconnectUser() {
    try {
      await streamClient.disconnectUser();
    } catch (error) {
      console.error('Error disconnecting from Stream:', error);
    }
  }

  async getLeagueChannel(leagueId: string): Promise<ChannelResponse> {
    try {
      const response = await api.get<ChannelResponse>(
        `/chat/leagues/${leagueId}/channel`
      );
      return response;
    } catch (error) {
      console.error('Error getting league channel:', error);
      throw error;
    }
  }

  async getChannelMessages(
    leagueId: string,
    limit: number = 30,
    before?: string
  ): Promise<MessagesResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(before && { before }),
    });

    return this.request<MessagesResponse>(
      'GET',
      `/chat/leagues/${leagueId}/messages?${params}`
    );
  }
}

export const chatService = new ChatService();
