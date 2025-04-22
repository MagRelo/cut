import cron from 'node-cron';
import { getPgaLeaderboard } from '../lib/pgaLeaderboard.js';
import { fetchScorecard } from '../lib/pgaScorecard.js';
import { prisma } from '../lib/prisma.js';

// Test player and tournament IDs for scorecard test
const TEST_PLAYER_ID = '34046'; // Example player ID
const TEST_TOURNAMENT_ID = 'R2024006'; // Example tournament ID

interface ApiTestResult {
  endpoint: string;
  success: boolean;
  error?: string;
  timestamp: Date;
}

async function testPgaLeaderboard(): Promise<ApiTestResult> {
  try {
    await getPgaLeaderboard();
    return {
      endpoint: 'PGA Leaderboard',
      success: true,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      endpoint: 'PGA Leaderboard',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    };
  }
}

async function testPgaScorecard(): Promise<ApiTestResult> {
  try {
    await fetchScorecard(TEST_PLAYER_ID, TEST_TOURNAMENT_ID);
    return {
      endpoint: 'PGA Scorecard',
      success: true,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      endpoint: 'PGA Scorecard',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    };
  }
}

async function logApiTestResult(result: ApiTestResult) {
  await prisma.systemProcessRecord.create({
    data: {
      processType: `API Health Check - ${result.endpoint}`,
      status: result.success ? 'SUCCESS' : 'FAILURE',
      processData: { details: result.error || 'API call successful' },
    },
  });

  // Log to console as well
  if (result.success) {
    console.log(`✅ ${result.endpoint} API check passed`);
  } else {
    console.error(`❌ ${result.endpoint} API check failed:`, result.error);
  }
}

// Run API health checks
async function runApiHealthChecks() {
  const leaderboardResult = await testPgaLeaderboard();
  await logApiTestResult(leaderboardResult);

  const scorecardResult = await testPgaScorecard();
  await logApiTestResult(scorecardResult);
}

// Start the API health check cron job
export function startApiHealthCheckCron() {
  // Check if API health check cron should be enabled
  if (process.env.ENABLE_API_HEALTH_CHECK !== 'true') {
    console.log(
      'API health check cron job is disabled via ENABLE_API_HEALTH_CHECK environment variable'
    );
    return;
  }

  // Run immediately when the server starts
  runApiHealthChecks().catch((error) => {
    console.error('Error in initial API health check:', error);
  });

  // Then run every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await runApiHealthChecks();
    } catch (error) {
      console.error('Error in API health check cron job:', error);
    }
  });
}
