import React, { useEffect, useCallback } from 'react';
import {
  Chat,
  Channel,
  ChannelHeader,
  MessageInput,
  MessageList,
  Thread,
  Window,
} from 'stream-chat-react';
import { useChatContext } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';

// Import the Stream Chat CSS
import 'stream-chat-react/dist/css/v2/index.css';

interface LeagueChatProps {
  leagueId: string;
}

export const LeagueChat: React.FC<LeagueChatProps> = ({ leagueId }) => {
  const { currentChannel, connectToLeague, isConnecting } = useChatContext();
  const { user } = useAuth();

  // Use useCallback to memoize the connection function
  const initializeChat = useCallback(async () => {
    if (!leagueId || !user?.id) return;

    try {
      await connectToLeague(leagueId);
    } catch (error) {
      console.error('Failed to initialize league chat:', error);
    }
  }, [leagueId, user?.id, connectToLeague]);

  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  if (!currentChannel || isConnecting) {
    return <div>Loading chat...</div>;
  }

  return (
    <div className='h-full flex flex-col'>
      <Chat client={currentChannel.getClient()} theme='str-chat__theme-light'>
        <Channel channel={currentChannel}>
          <Window>
            <ChannelHeader />
            <MessageList />
            <MessageInput />
          </Window>
          <Thread />
        </Channel>
      </Chat>
    </div>
  );
};
