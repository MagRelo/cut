import { PlayerProfileUpdateService } from '../src/services/playerProfileUpdateService.js';

async function main() {
  try {
    const service = new PlayerProfileUpdateService();
    await service.updateAllProfiles();
    console.log('Player profile update completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Failed to update player profiles:', error);
    process.exit(1);
  }
}

main();
