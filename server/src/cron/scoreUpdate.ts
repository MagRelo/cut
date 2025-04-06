import cron from 'node-cron';
import { ScoreUpdateService } from '../services/scoreUpdateService';

const scoreUpdateService = new ScoreUpdateService();

// TODO: In a real application, you would need to:
// 1. Store the current tournament ID in the database
// 2. Have an API to update the current tournament ID
// 3. Have logic to determine when a tournament is active
const CURRENT_TOURNAMENT_ID = process.env.CURRENT_TOURNAMENT_ID;

// Schedule the job to run every 10 minutes
export function startScoreUpdateCron() {
  if (!CURRENT_TOURNAMENT_ID) {
    console.error('No tournament ID configured. Score updates will not run.');
    return;
  }

  console.log('Starting score update cron job...');

  // Run every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    try {
      await scoreUpdateService.updateAllScores(CURRENT_TOURNAMENT_ID);
    } catch (error) {
      console.error('Error in score update cron job:', error);
    }
  });
}
