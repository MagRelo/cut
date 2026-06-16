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
import { useActiveEvent } from "./useActiveEvent";

export function useContestLobbyState(contest: Contest | undefined): {
  viewModel: ContestLobbyViewModel | null;
  isChainStateLoading: boolean;
} {
  const hasWallet = Boolean(useEffectiveWalletAddress());
  const { activeEvent, eventName, eventStartDate, roundDisplay, status } = useActiveEvent();

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
    if (!contest) return null;

    const eventMatchesContest = activeEvent?.event.id === contest.eventId;
    const input: DeriveContestLobbyViewModelInput = {
      contestStateOnChain:
        contestStateOnChain !== undefined ? Number(contestStateOnChain) : undefined,
      hasWallet,
      eventStartDate: eventMatchesContest ? eventStartDate : undefined,
      eventName: eventMatchesContest ? eventName : undefined,
      eventNotStarted: eventMatchesContest ? status === "SCHEDULED" : undefined,
      roundDisplay: eventMatchesContest ? roundDisplay : undefined,
    };

    return deriveContestLobbyViewModel(contest, input);
  }, [
    contest,
    contestStateOnChain,
    hasWallet,
    activeEvent?.event.id,
    eventStartDate,
    eventName,
    status,
    roundDisplay,
  ]);

  return { viewModel, isChainStateLoading };
}
