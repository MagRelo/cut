import { useMemo } from "react";
import { type Contest } from "../types/contest";
import { type ContestLobbyViewModel } from "../types/contestLobby";
import { useContestChain } from "../chain/useContestChain";
import {
  deriveContestLobbyViewModel,
  type DeriveContestLobbyViewModelInput,
} from "./deriveContestLobbyViewModel";
import { useEffectiveWalletAddress } from "./useEffectiveWalletAddress";
import { useContestEvent } from "./useContestEvent";

export function useContestLobbyState(
  contest: Contest | undefined,
  options: { isContestDataPending?: boolean } = {},
): {
  viewModel: ContestLobbyViewModel | null;
  isChainStateLoading: boolean;
  contestStateOnChain: number | undefined;
} {
  const hasWallet = Boolean(useEffectiveWalletAddress());
  const contestEvent = useContestEvent(contest);
  const { periodDisplay, eventShell } = contestEvent;
  const isContestDataPending = options.isContestDataPending ?? false;
  const snapshot = useContestChain(contest, { enabled: Boolean(contest?.address) });
  const contestStateOnChain = snapshot.state;

  const viewModel = useMemo(() => {
    if (!contest || !eventShell) return null;

    const input: DeriveContestLobbyViewModelInput = {
      contestStateOnChain,
      hasWallet,
      periodDisplay: periodDisplay ?? undefined,
      isContestDataPending,
    };

    return deriveContestLobbyViewModel(contest, input);
  }, [contest, contestStateOnChain, hasWallet, eventShell, periodDisplay, isContestDataPending]);

  return {
    viewModel,
    isChainStateLoading: snapshot.isLoading,
    contestStateOnChain,
  };
}
