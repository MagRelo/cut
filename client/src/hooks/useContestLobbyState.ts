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

export function useContestLobbyState(contest: Contest | undefined): {
  viewModel: ContestLobbyViewModel | null;
  isChainStateLoading: boolean;
} {
  const hasWallet = Boolean(useEffectiveWalletAddress());

  const {
    data: contestStateOnChain,
    isLoading: isChainStateLoading,
  } = useReadContract({
    address: contest?.address as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "state",
    chainId: contest?.chainId as 8453 | 84532 | undefined,
    query: {
      enabled: Boolean(contest?.address),
    },
  });

  const viewModel = useMemo(() => {
    if (!contest) return null;

    const input: DeriveContestLobbyViewModelInput = {
      contestStateOnChain:
        contestStateOnChain !== undefined ? Number(contestStateOnChain) : undefined,
      hasWallet,
    };

    return deriveContestLobbyViewModel(contest, input);
  }, [contest, contestStateOnChain, hasWallet]);

  return { viewModel, isChainStateLoading };
}
