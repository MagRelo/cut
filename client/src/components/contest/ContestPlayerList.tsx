import { useState } from "react";
import { PlayerDetailModal } from "../player/PlayerDetailModal";
import { PlayerDisplayRow } from "../player/PlayerDisplayRow";
import { useAuth } from "../../contexts/AuthContext";
import type { Contest } from "../../types/contest";
import type { PlayerWithTournamentData } from "../../types/player";
import { comparePlayersByLeaderboard } from "../../utils/playerSorting";

interface ContestPlayerListProps {
  contest?: Contest;
  roundDisplay?: string;
}

export const ContestPlayerList = ({ contest, roundDisplay }: ContestPlayerListProps) => {
  const { user } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithTournamentData | null>(null);
  const openPlayerModal = (player: PlayerWithTournamentData) => {
    setSelectedPlayer(player);
    setIsModalOpen(true);
  };

  const closePlayerModal = () => {
    setIsModalOpen(false);
    setSelectedPlayer(null);
  };

  const processPlayersData = () => {
    if (!contest?.contestLineups) return [];

    const playerMap = new Map();
    const totalLineups = contest.contestLineups.length;

    contest.contestLineups.forEach((lineup) => {
      if (lineup.tournamentLineup?.players) {
        lineup.tournamentLineup.players.forEach((player) => {
          const playerId = player.id;

          if (!playerMap.has(playerId)) {
            playerMap.set(playerId, {
              player: {
                ...player,
                ownershipPercentage: 0,
              },
              ownedByLineups: 0,
              ownershipPercentage: 0,
              totalScore: player.tournamentData?.total || 0,
              leaderboardPosition: player.tournamentData?.leaderboardPosition || "–",
              leaderboardTotal: player.tournamentData?.leaderboardTotal || "–",
              isOwnedByCurrentUser: false,
            });
          }

          const playerData = playerMap.get(playerId);
          playerData.ownedByLineups += 1;
          playerData.ownershipPercentage = Math.round(
            (playerData.ownedByLineups / totalLineups) * 100,
          );
          playerData.player.ownershipPercentage = playerData.ownershipPercentage;

          if (lineup.userId === user?.id) {
            playerData.isOwnedByCurrentUser = true;
          }
        });
      }
    });

    return Array.from(playerMap.values()).sort((a, b) => {
      return comparePlayersByLeaderboard(a.player, b.player);
    });
  };

  const playersData = processPlayersData();

  if (playersData.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 font-display">No players found in this contest.</p>
      </div>
    );
  }

  return (
    <>
      <div className="px-2 mt-3">
        {playersData.map((playerData) => (
          <div key={playerData.player.id} className="border-b border-gray-200">
            <PlayerDisplayRow
              player={playerData.player}
              roundDisplay={roundDisplay || "R1"}
              onClick={() => openPlayerModal(playerData.player)}
              ownershipPercentage={playerData.ownershipPercentage}
              isOwnedByCurrentUser={playerData.isOwnedByCurrentUser}
            />
          </div>
        ))}
      </div>

      <PlayerDetailModal
        isOpen={isModalOpen}
        onClose={closePlayerModal}
        player={selectedPlayer}
        roundDisplay={roundDisplay || "R1"}
      />
    </>
  );
};
