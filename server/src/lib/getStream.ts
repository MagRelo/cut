import { StreamChat } from 'stream-chat';

// Validate required environment variables
const requiredEnvVars = [
  'GETSTREAM_API_KEY',
  'GETSTREAM_API_SECRET',
  'GETSTREAM_APP_ID',
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Initialize the GetStream client
const streamClient = StreamChat.getInstance(
  process.env.GETSTREAM_API_KEY as string,
  process.env.GETSTREAM_API_SECRET as string
);

export { streamClient };

// Helper function to generate a user token
export const generateUserToken = (userId: string) => {
  return streamClient.createToken(userId);
};

// Helper function to ensure a user exists in GetStream
export const ensureStreamUser = async (
  userId: string,
  userData: {
    name?: string;
    image?: string;
  }
) => {
  try {
    await streamClient.upsertUser({
      id: userId,
      ...userData,
    });
  } catch (error) {
    console.error('Error ensuring stream user:', error);
    throw error;
  }
};

// Helper function to create or update a league channel
export const createOrUpdateLeagueChannel = async (
  leagueId: string,
  leagueName: string,
  members: string[],
  createdById: string
) => {
  const channel = streamClient.channel('league', `league-${leagueId}`, {
    name: leagueName,
    members,
    created_by_id: createdById,
    custom_data: {
      leagueId,
      createdAt: new Date().toISOString(),
    },
  });

  try {
    await channel.create();
    return channel;
  } catch (error) {
    console.error('Error creating/updating league channel:', error);
    throw error;
  }
};

// Helper function to initialize Stream channel types
export const initializeStreamChannelTypes = async () => {
  try {
    await streamClient.createChannelType({
      name: 'league',
      commands: ['giphy'],
      mutes: true,
      reactions: true,
      replies: true,
      search: true,
      typing_events: true,
      read_events: true,
      connect_events: true,
      push_notifications: true,
      message_retention: 'infinite',
      max_message_length: 5000,
    });
    console.log('Successfully initialized league channel type');
  } catch (error: any) {
    // If the channel type already exists, that's fine
    if (
      error.code === 4 &&
      error.message.includes('channel type already exists')
    ) {
      console.log('League channel type already exists');
      return;
    }
    console.error('Error initializing league channel type: league');
    // throw error;
  }
};
