import { useCallback, useMemo } from 'react';
import { type Contest } from '../types.new/contest';
import { type ContestLineup } from '../types.new/lineup';
import apiClient from '../utils/apiClient';

export const useContestApi = () => {
  const getAllContests = useCallback(
    () => apiClient.get<Contest[]>('/contests'),
    []
  );

  const getContestById = useCallback(
    (id: string) => apiClient.get<Contest>(`/contests/${id}`),
    []
  );

  const createContest = useCallback(
    (data: Partial<Contest>) => apiClient.post<Contest>('/contests', data),
    []
  );

  // const updateContest = useCallback(
  //   (id: string, data: Partial<Contest>) =>
  //     apiClient.put<Contest>(`/contests/${id}`, data),
  //   []
  // );

  // const deleteContest = useCallback(
  //   (id: string) => apiClient.delete<void>(`/contests/${id}`),
  //   []
  // );

  // const getContestLineups = useCallback(
  //   (contestId: string) =>
  //     apiClient.get<ContestLineup[]>(`/contests/${contestId}/lineups`),
  //   []
  // );

  const addLineupToContest = useCallback(
    (contestId: string, data: { tournamentLineupId: string }) =>
      apiClient.post<Contest>(`/contests/${contestId}/lineups`, data),
    []
  );

  const removeLineupFromContest = useCallback(
    (contestId: string, lineupId: string) =>
      apiClient.delete<Contest>(`/contests/${contestId}/lineups/${lineupId}`),
    []
  );

  return useMemo(
    () => ({
      getAllContests,
      getContestById,
      createContest,
      // updateContest,
      // deleteContest,
      // getContestLineups,
      addLineupToContest,
      removeLineupFromContest,
    }),
    [
      getAllContests,
      getContestById,
      createContest,
      // updateContest,
      // deleteContest,
      // getContestLineups,
      addLineupToContest,
      removeLineupFromContest,
    ]
  );
};
