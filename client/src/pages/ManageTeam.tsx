import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { Team } from '../types/team';
import { api } from '../services/api';
import type { PGAPlayer } from '../schemas/team';

import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { TeamHeader } from '../components/team/TeamHeader';
import { PlayerTable } from '../components/team/PlayerTable';
import { TeamStats } from '../components/team/TeamStats';

type EditMode = 'none' | 'team' | 'active';

export default function ManageTeam() {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [editedTeam, setEditedTeam] = useState<Team | null>(null);
  const [pgaPlayers, setPGAPlayers] = useState<PGAPlayer[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [teamData, playersData] = await Promise.all([
          api.getTeam(teamId!),
          api.getPGATourPlayers(),
        ]);
        setTeam(teamData);
        setEditedTeam(teamData);
        setPGAPlayers(playersData);
      } catch {
        setError('Failed to load team data');
      } finally {
        setIsLoading(false);
      }
    };

    if (teamId) {
      fetchData();
    }
  }, [teamId]);

  const handleSave = async () => {
    if (!editedTeam || !teamId) return;

    if (
      editMode === 'team' &&
      editedTeam.players.some((p) => !p.id || p.id.startsWith('empty-'))
    ) {
      alert('Please select all 8 players before saving.');
      return;
    }

    if (editMode === 'active') {
      try {
        const currentTournament = await api.getCurrentTournament();

        if (!currentTournament || currentTournament.status !== 'UPCOMING') {
          alert('Team lineups can only be modified for upcoming tournaments.');
          return;
        }

        const activeCount = editedTeam.players.filter((p) => p.isActive).length;
        if (activeCount > 4) {
          alert('You can only select up to 4 players for the current week.');
          return;
        }
      } catch (error) {
        setError(
          'Failed to verify tournament status: ' +
            (error instanceof Error ? error.message : 'Unknown error')
        );
        return;
      }
    }

    setError(null);
    setIsSaving(true);

    try {
      let updatedTeam: Team;

      if (editMode === 'team') {
        updatedTeam = await api.updateTeam(teamId, {
          name: editedTeam.name,
          players: editedTeam.players.map((p) => ({ id: p.id, name: p.name })),
        });
      } else {
        const activePlayerIds = editedTeam.players
          .filter((p) => p.isActive)
          .map((p) => p.id);

        updatedTeam = await api.setActivePlayers({
          teamId,
          activePlayerIds,
        });
      }

      setTeam(updatedTeam);
      setEditedTeam(updatedTeam);
      setEditMode('none');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An error occurred while saving'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedTeam(team);
    setEditMode('none');
  };

  const handlePlayerSelect = (playerId: string, position: number) => {
    if (!editedTeam) return;

    const selectedPlayer = pgaPlayers.find((p) => p.id === playerId);
    if (!selectedPlayer) return;

    const updatedPlayers = [...editedTeam.players];
    updatedPlayers[position] = {
      ...updatedPlayers[position],
      id: selectedPlayer.id,
      name: selectedPlayer.name,
      pgaTourId: selectedPlayer.id,
      isActive: position < 4,
    };

    setEditedTeam({
      ...editedTeam,
      players: updatedPlayers,
    });
  };

  const togglePlayerActive = (index: number) => {
    if (!editedTeam) return;

    const activeCount = editedTeam.players.filter((p) => p.isActive).length;
    const player = editedTeam.players[index];

    if (!player.isActive && activeCount >= 4) {
      alert('You can only select up to 4 players for the current week.');
      return;
    }

    const newPlayers = [...editedTeam.players];
    newPlayers[index] = {
      ...player,
      isActive: !player.isActive,
    };

    setEditedTeam({
      ...editedTeam,
      players: newPlayers,
    });
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!team || !editedTeam) {
    return (
      <div className='py-6'>
        <div className='text-center text-gray-600'>Team not found</div>
      </div>
    );
  }

  const activePlayerCount =
    editedTeam.players?.filter((p) => p.isActive).length ?? 0;

  return (
    <div className='py-6'>
      {error && <ErrorMessage message={error} />}

      <TeamHeader
        team={team}
        editedTeam={editedTeam}
        editMode={editMode}
        isSaving={isSaving}
        onSave={handleSave}
        onCancel={handleCancel}
        onEditModeChange={setEditMode}
        onTeamNameChange={(name) =>
          setEditedTeam((prev) => (prev ? { ...prev, name } : null))
        }
      />

      <div className='bg-white rounded-lg shadow-sm p-6'>
        <PlayerTable
          players={editedTeam.players}
          editMode={editMode}
          pgaPlayers={pgaPlayers}
          activePlayerCount={activePlayerCount}
          onPlayerSelect={handlePlayerSelect}
          onToggleActive={togglePlayerActive}
        />

        {editMode === 'none' && <TeamStats team={editedTeam} />}
      </div>
    </div>
  );
}
