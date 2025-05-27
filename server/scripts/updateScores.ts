import { ScoreUpdateService } from '../src/services/scoreUpdateService.js';

async function main() {
  try {
    const service = new ScoreUpdateService();
    await service.updateAllScores();
    console.log('Score update completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Failed to update scores:', error);
    process.exit(1);
  }
}

main();
