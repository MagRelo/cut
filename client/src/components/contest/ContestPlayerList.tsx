import { useState } from "react";
import { PlayerDetailModal } from "../player/PlayerDetailModal";
import { PlayerDisplayRow } from "../player/PlayerDisplayRow";
import { usePortoAuth } from "../../contexts/PortoAuthContext";
import type { Contest } from "../../types/contest";
import type { PlayerWithTournamentData } from "../../types/player";

const PLAYER_SORT_BUCKET = {
  noData: 205,
  wd: 203,
  cut: 202,
  noPosition: 201,
} as const;

const getPlayerSortIndex = (player?: PlayerWithTournamentData | null) => {
  if (!player) return PLAYER_SORT_BUCKET.noData;

  const score = player.tournamentData?.leaderboardTotal?.trim();
  const position = player.tournamentData?.leaderboardPosition?.trim().toUpperCase();

  if (!score) return PLAYER_SORT_BUCKET.noData;
  if (position === "WD") return PLAYER_SORT_BUCKET.wd;
  if (position === "CUT") return PLAYER_SORT_BUCKET.cut;
  if (position === "-") return PLAYER_SORT_BUCKET.noPosition;
  if (score === "E") return 0;

  const numericScore = Number.parseInt(score, 10);
  return Number.isNaN(numericScore) ? PLAYER_SORT_BUCKET.noData : numericScore;
};

const getNumericPosition = (player: PlayerWithTournamentData) => {
  const rawPosition = player.tournamentData?.leaderboardPosition?.trim().toUpperCase() || "";
  const normalizedPosition = rawPosition.startsWith("T") ? rawPosition.slice(1) : rawPosition;
  const parsedPosition = Number.parseInt(normalizedPosition, 10);
  return Number.isNaN(parsedPosition) ? Number.POSITIVE_INFINITY : parsedPosition;
};

interface ContestPlayerListProps {
  contest?: Contest;
  roundDisplay?: string;
}

export const ContestPlayerList = ({ contest, roundDisplay }: ContestPlayerListProps) => {
  const { user } = usePortoAuth();

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
      const sortIndexDiff = getPlayerSortIndex(a.player) - getPlayerSortIndex(b.player);
      if (sortIndexDiff !== 0) return sortIndexDiff;

      const positionDiff = getNumericPosition(a.player) - getNumericPosition(b.player);
      if (positionDiff !== 0) return positionDiff;

      const aName =
        a.player.pga_displayName ||
        `${a.player.pga_lastName || ""} ${a.player.pga_firstName || ""}`.trim();
      const bName =
        b.player.pga_displayName ||
        `${b.player.pga_lastName || ""} ${b.player.pga_firstName || ""}`.trim();
      return aName.localeCompare(bName);
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
