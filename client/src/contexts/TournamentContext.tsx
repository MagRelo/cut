import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { type Tournament } from '../types/league';
import { type TournamentPlayer } from '../types/player';
import { useTournamentApi } from '../services/tournamentApi';

interface TournamentContextType {
  currentTournament: Tournament | null;
  setCurrentTournament: (tournament: Tournament | null) => void;
  players: TournamentPlayer[];
  isLoading: boolean;
  error: Error | null;
}

const TournamentContext = createContext<TournamentContextType | undefined>(
  undefined
);

interface TournamentProviderProps {
  children: ReactNode;
}

export function TournamentProvider({ children }: TournamentProviderProps) {
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(
    null
  );
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const tournamentApi = useTournamentApi();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch current tournament and players in parallel
        const [tournament, tournamentPlayers] = await Promise.all([
          tournamentApi.getCurrentTournament(),
          tournamentApi.getTournamentField(),
        ]);

        setCurrentTournament(tournament);
        setPlayers(tournamentPlayers);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to fetch tournament data')
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [tournamentApi]);

  const value = {
    currentTournament,
    setCurrentTournament,
    players,
    isLoading,
    error,
  };

  return (
    <TournamentContext.Provider value={value}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const context = useContext(TournamentContext);
  if (context === undefined) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
}
