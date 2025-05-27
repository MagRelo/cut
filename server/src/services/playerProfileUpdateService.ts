import { getActivePlayers } from '../lib/pgaField.js';
import { getPlayerProfileOverview } from '../lib/playerProfileOverview.js';
import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';

interface TeamPlayerWithPlayer {
  id: string;
  active: boolean;
  player: {
    id: string;
    pga_pgaTourId: string | null;
  };
}

export class PlayerProfileUpdateService {
  private async getActiveTeamPlayers(): Promise<TeamPlayerWithPlayer[]> {
    const players = await prisma.player.findMany({
      where: {
        inField: true,
        pga_pgaTourId: {
          not: null,
        },
      },
    });
    return players.map((player) => ({
      id: player.id,
      active: true,
      player: {
        id: player.id,
        pga_pgaTourId: player.pga_pgaTourId,
      },
    })) as TeamPlayerWithPlayer[];
  }

  private async updatePlayerProfile(playerId: string, pgaTourId: string) {
    try {
      const profileData = await getPlayerProfileOverview(pgaTourId);

      // Extract relevant data from the profile, defaulting to null if not available
      const performanceData = {
        owgr: profileData?.standings?.owgr || null,
        fedex: profileData?.standings?.rank || null,
        performance:
          profileData?.performance && Array.isArray(profileData.performance)
            ? profileData.performance.find((p) => p.season === '2025') ||
              Prisma.JsonNull
            : Prisma.JsonNull,
      };

      await prisma.player.update({
        where: { id: playerId },
        data: {
          pga_owgr: performanceData.owgr,
          pga_fedex: performanceData.fedex,
          pga_performance: performanceData.performance,
        },
      });

      // If we didn't get valid profile data, throw an error to track this as a failure
      if (!profileData) {
        throw new Error(`No profile data available for player ${pgaTourId}`);
      }
    } catch (error) {
      console.error(
        `Error updating profile for player ${playerId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      throw error;
    }
  }

  private async recordProcessStatus(
    status: 'SUCCESS' | 'FAILURE',
    tournament: any,
    activePlayers: TeamPlayerWithPlayer[],
    error?: any
  ) {
    await prisma.systemProcessRecord.create({
      data: {
        processType: 'PROFILE_UPDATE',
        status,
        processData: {
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          playersUpdated: activePlayers.length,
          timestamp: new Date().toISOString(),
          ...(error && { error: error.message || String(error) }),
        },
      },
    });
  }

  async updateAllProfiles() {
    let tournament: any;
    let activePlayers: TeamPlayerWithPlayer[] = [];
    let failedPlayers = 0;
    let totalPlayers = 0;
    let failedPlayerIds: string[] = [];

    try {
      console.log('Starting profile update for all active team players...');

      tournament = await prisma.tournament.findFirst({
        where: { manualActive: true },
      });
      if (!tournament) {
        console.error(`Active Tournament not found`);
        return;
      }

      // Update inField status for players in the field
      const fieldData = await getActivePlayers(tournament.pgaTourId);
      const fieldPlayerIds = fieldData.players.map((p) => p.id);
      await prisma.player.updateMany({
        where: { pga_pgaTourId: { in: fieldPlayerIds } },
        data: { inField: true },
      });
      console.log(
        `Updated inField status for ${fieldPlayerIds.length} players in '${tournament.name}'.`
      );

      // Set inField to false for all others
      await prisma.player.updateMany({
        where: { pga_pgaTourId: { notIn: fieldPlayerIds } },
        data: { inField: false },
      });
      console.log('Set inField to false for all other players.');

      // Update profiles for active team players
      activePlayers = await this.getActiveTeamPlayers();
      totalPlayers = activePlayers.length;
      console.log(`Found ${totalPlayers} active team players`);

      const updatePromises = activePlayers.map((player) => {
        if (!player.player.pga_pgaTourId) {
          console.warn(`No PGA Tour ID found for player ${player.player.id}`);
          failedPlayers++;
          failedPlayerIds.push(player.player.id);
          return Promise.resolve();
        }

        return this.updatePlayerProfile(
          player.id,
          player.player.pga_pgaTourId
        ).catch((error) => {
          failedPlayers++;
          failedPlayerIds.push(player.player.pga_pgaTourId!);
          console.error(
            `Failed to update player ${player.player.pga_pgaTourId}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
          return Promise.resolve(); // Continue with other players even if one fails
        });
      });

      await Promise.all(updatePromises);
      console.log(`Profile update completed at ${new Date()}`);
      console.log(
        `Successfully updated ${
          totalPlayers - failedPlayers
        } out of ${totalPlayers} players`
      );
      if (failedPlayers > 0) {
        console.error(`Failed to update ${failedPlayers} players`);
        console.error('Failed player IDs:', failedPlayerIds.join(', '));
        throw new Error(`Failed to update ${failedPlayers} players`);
      }

      await this.recordProcessStatus('SUCCESS', tournament, activePlayers);
    } catch (error) {
      console.error('Error updating profiles:', error);
      if (tournament && activePlayers.length > 0) {
        await this.recordProcessStatus(
          'FAILURE',
          tournament,
          activePlayers,
          error
        );
      }
      throw error;
    }
  }
}
