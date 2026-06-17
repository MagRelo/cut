import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { type Contest } from "../types/contest";
import { type ContestLobbyViewModel } from "../types/contestLobby";
import ContestContract from "../utils/contracts/ContestController.json";
import {
  deriveContestLobbyViewModel,
  type DeriveContestLobbyViewModelInput,
} from "./deriveContestLobbyViewModel";
import { useEffectiveWalletAddress } from "./useEffectiveWalletAddress";
import { useContestEvent } from "./useContestEvent";

export function useContestLobbyState(contest: Contest | undefined): {
  viewModel: ContestLobbyViewModel | null;
  isChainStateLoading: boolean;
} {
  const hasWallet = Boolean(useEffectiveWalletAddress());
  const contestEvent = useContestEvent(contest);
  const { roundDisplay, eventShell } = contestEvent;

  const { data: contestStateOnChain, isLoading: isChainStateLoading } = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "state",
    chainId: contest?.chainId as 8453 | 84532 | undefined,
    query: {
      enabled: Boolean(contest?.address),
    },
  });

  const viewModel = useMemo(() => {
    if (!contest || !eventShell) return null;

    const input: DeriveContestLobbyViewModelInput = {
      contestStateOnChain:
        contestStateOnChain !== undefined ? Number(contestStateOnChain) : undefined,
      hasWallet,
      roundDisplay: roundDisplay ?? undefined,
    };

    return deriveContestLobbyViewModel(contest, input);
  }, [
    contest,
    contestStateOnChain,
    hasWallet,
    eventShell,
    roundDisplay,
  ]);

  return { viewModel, isChainStateLoading };
}
