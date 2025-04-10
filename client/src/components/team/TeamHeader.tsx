import React from 'react';
import type { Team } from '../../types/team';

interface TeamHeaderProps {
  team: Team;
  editedTeam: Team;
  editMode: 'none' | 'team' | 'active';
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
  onEditModeChange: (mode: 'none' | 'team' | 'active') => void;
  onTeamNameChange?: (name: string) => void;
}

export const TeamHeader: React.FC<TeamHeaderProps> = ({
  team,
  editedTeam,
  editMode,
  isSaving,
  onSave,
  onCancel,
  onEditModeChange,
  onTeamNameChange,
}) => {
  return (
    <div className='mb-6'>
      <h1 className='text-2xl font-bold text-emerald-600'>Manage Team</h1>

      <div className='flex justify-between items-center mt-4'>
        <div>
          {editMode === 'team' ? (
            <input
              type='text'
              value={editedTeam.name}
              onChange={(e) => onTeamNameChange?.(e.target.value)}
              className='text-xl font-semibold px-2 py-1 border rounded'
            />
          ) : (
            <h2 className='text-xl font-semibold'>{team.name}</h2>
          )}
        </div>

        <div className='space-x-2'>
          {editMode === 'none' ? (
            <>
              <button
                onClick={() => onEditModeChange('team')}
                className='px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700'>
                Edit Team
              </button>
              <button
                onClick={() => onEditModeChange('active')}
                className='px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700'>
                Set Active Players
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onSave}
                disabled={isSaving}
                className='px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center'>
                {isSaving ? (
                  <>
                    <svg
                      className='animate-spin -ml-1 mr-2 h-4 w-4 text-white'
                      xmlns='http://www.w3.org/2000/svg'
                      fill='none'
                      viewBox='0 0 24 24'>
                      <circle
                        className='opacity-25'
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='4'
                      />
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                      />
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </button>
              <button
                onClick={onCancel}
                disabled={isSaving}
                className='px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed'>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
