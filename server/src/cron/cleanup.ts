import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';

const prisma = new PrismaClient();

// Cleanup old cache entries
async function cleanupOldCacheEntries() {
  try {
    const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const cutoffDate = new Date(Date.now() - ONE_DAY);

    const deletedCount = await prisma.oddsCache.deleteMany({
      where: {
        updatedAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`Cleaned up ${deletedCount.count} old cache entries`);
  } catch (error) {
    console.error('Error cleaning up cache entries:', error);
  }
}

// Schedule cleanup to run daily at midnight
export function startCleanupCron() {
  cron.schedule('0 0 * * *', () => {
    console.log('Running scheduled cleanup tasks...');
    cleanupOldCacheEntries();
  });
}

export { cleanupOldCacheEntries };
