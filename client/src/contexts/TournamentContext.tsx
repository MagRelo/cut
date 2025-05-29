import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const tournamentApi = useTournamentApi();

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch current tournament and players in parallel
        const [tournament, tournamentPlayers] = await Promise.all([
          tournamentApi.getCurrentTournament(),
          tournamentApi.getTournamentField(),
        ]);

        if (isMounted) {
          setCurrentTournament(tournament);
          setPlayers(tournamentPlayers);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error('Failed to fetch tournament data')
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [tournamentApi]);

  const value = useMemo(
    () => ({
      currentTournament,
      setCurrentTournament,
      players,
      isLoading,
      error,
    }),
    [currentTournament, players, isLoading, error]
  );

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
