import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { ScoreUpdateService } from '../services/scoreUpdateService.js';
import { TournamentStatus } from '../schemas/tournament.js';
import { prisma } from '../lib/prisma.js';

const scoreUpdateService = new ScoreUpdateService();

// Schedule the job to run based on environment variable frequency
export function startScoreUpdateCron() {
  // Check if score update cron should be enabled
  if (process.env.ENABLE_SCORE_UPDATE_CRON !== 'true') {
    console.log(
      'Score update cron job is disabled via ENABLE_SCORE_UPDATE_CRON environment variable'
    );
    return;
  }

  let cronFrequency = process.env.FREQUENCY_SCORE_UPDATE_CRON || '*/10 * * * *';

  // Validate cron expression
  if (!cron.validate(cronFrequency)) {
    console.error(
      `Invalid cron expression: ${cronFrequency}. Defaulting to every 10 minutes.`
    );
    cronFrequency = '*/10 * * * *';
  }

  console.log(
    `Starting score update cron job with frequency: ${cronFrequency}`
  );

  // Run every 10 minutes
  cron.schedule(cronFrequency, async () => {
    try {
      // Find tournament that is IN_PROGRESS
      const activeTournament = await prisma.tournament.findFirst({
        where: {
          status: TournamentStatus.IN_PROGRESS,
        },
      });

      if (!activeTournament) {
        console.log('No active tournament found. Skipping score update.');
        return;
      }

      await scoreUpdateService.updateAllScores(activeTournament.pgaTourId);
    } catch (error) {
      console.error('Error in score update cron job:', error);
    }
  });
}
