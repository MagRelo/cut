import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';
import { Channel } from 'stream-chat';
import { chatService, streamClient } from '../services/chatService';
import { useAuth } from './AuthContext';

interface ChatContextType {
  currentChannel: Channel | null;
  setCurrentChannel: (channel: Channel | null) => void;
  isConnecting: boolean;
  isInitialized: boolean;
  connectToLeague: (leagueId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: React.ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { user, streamToken } = useAuth();
  const hasInitialized = useRef(false);
  const connectionAttemptRef = useRef<{
    leagueId: string;
    promise: Promise<void>;
  } | null>(null);

  useEffect(() => {
    let cleanupFunction = false;

    const initChat = async () => {
      // Only initialize once and when we have the required data
      if (!user?.id || !streamToken) {
        // Clean up chat connection if user logs out
        await chatService.disconnectUser();
        setCurrentChannel(null);
        setIsInitialized(false);
        hasInitialized.current = false;
        return;
      }

      if (hasInitialized.current) {
        return;
      }

      if (cleanupFunction) {
        return;
      }

      try {
        setIsConnecting(true);
        hasInitialized.current = true;

        // Check if we're already connected as this user
        const hasUser = !!streamClient.userID;

        if (hasUser && streamClient.userID === user.id) {
          setIsInitialized(true);
          return;
        }

        await chatService.connectUser(user.id, streamToken);

        // Verify connection was successful
        if (!streamClient.userID) {
          throw new Error(
            'Stream client failed to connect after connectUser call'
          );
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to connect to Stream:', error);
        hasInitialized.current = false;
        setIsInitialized(false);
      } finally {
        if (!cleanupFunction) {
          setIsConnecting(false);
        }
      }
    };

    initChat();

    // Cleanup function
    return () => {
      cleanupFunction = true;
      setIsInitialized(false);
    };
  }, [user?.id, streamToken]);

  const waitForInitialization = async (timeoutMs = 5000): Promise<boolean> => {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (streamClient.userID) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return false;
  };

  const connectToLeague = useCallback(
    async (leagueId: string) => {
      // First ensure we have the required data
      if (!user?.id || !streamToken) {
        throw new Error('Missing required user data for league connection');
      }

      // If we're already connecting to this league, return the existing promise
      if (connectionAttemptRef.current?.leagueId === leagueId) {
        return connectionAttemptRef.current.promise;
      }

      // If we're already connected to this league, don't reconnect
      if (currentChannel?.id === `league-${leagueId}`) {
        return;
      }

      try {
        setIsConnecting(true);

        // Ensure Stream client is properly initialized first
        if (!streamClient.userID) {
          await chatService.connectUser(user.id, streamToken);

          // Wait for client to be ready
          const initialized = await waitForInitialization(10000); // Increased timeout to 10 seconds
          if (!initialized) {
            throw new Error('Failed to initialize Stream client');
          }
        }

        // Create a new connection attempt
        const connectionPromise = (async () => {
          try {
            const { channel: channelData } = await chatService.getLeagueChannel(
              leagueId
            );
            const channel = streamClient.channel(
              channelData.type,
              channelData.id
            );
            await channel.watch();
            setCurrentChannel(channel);
          } finally {
            // Clear the connection attempt reference if it's still this one
            if (connectionAttemptRef.current?.leagueId === leagueId) {
              connectionAttemptRef.current = null;
            }
            setIsConnecting(false);
          }
        })();

        // Store the connection attempt
        connectionAttemptRef.current = {
          leagueId,
          promise: connectionPromise,
        };

        await connectionPromise;
      } catch (error) {
        console.error('Failed to connect to league channel:', error);
        throw error;
      }
    },
    [currentChannel, user?.id, streamToken, waitForInitialization]
  );

  const value = React.useMemo(
    () => ({
      currentChannel,
      setCurrentChannel,
      isConnecting,
      isInitialized,
      connectToLeague,
    }),
    [currentChannel, isConnecting, isInitialized, connectToLeague]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
