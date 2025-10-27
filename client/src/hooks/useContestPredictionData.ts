import { useAccount, useReadContract, useChainId } from "wagmi";
import { formatUnits } from "viem";
import ContestContract from "../utils/contracts/Contest.json";

// Contract state enum matching Contest.sol
export enum ContestState {
  OPEN = 0,
  ACTIVE = 1,
  LOCKED = 2,
  SETTLED = 3,
  CANCELLED = 4,
  CLOSED = 5,
}

interface UseContestPredictionDataOptions {
  contestAddress: string;
  entryIds?: string[]; // Array of entry IDs to fetch data for
  enabled?: boolean;
}

/**
 * Hook to read prediction market data from the Contest contract
 * Fetches LMSR prices, user balances, and contest state
 */
export function useContestPredictionData(options: UseContestPredictionDataOptions) {
  const { contestAddress, entryIds = [], enabled = true } = options;
  const { address: userAddress } = useAccount();
  const chainId = useChainId();

  // Read contest state
  const { data: contestState, isLoading: isLoadingState } = useReadContract({
    address: contestAddress as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "state",
    chainId,
    query: {
      enabled: enabled && !!contestAddress,
    },
  });

  // Read total spectator collateral (total prize pool)
  const { data: totalSpectatorCollateral } = useReadContract({
    address: contestAddress as `0x${string}`,
    abi: ContestContract.abi,
    functionName: "totalSpectatorCollateral",
    chainId,
    query: {
      enabled: enabled && !!contestAddress,
    },
  });

  // Helper to determine if predictions are available
  const canPredict = contestState === ContestState.OPEN || contestState === ContestState.ACTIVE;
  const canWithdraw =
    contestState === ContestState.OPEN ||
    contestState === ContestState.ACTIVE ||
    contestState === ContestState.CANCELLED;
  const canClaim = contestState === ContestState.SETTLED;

  // Read LMSR prices for each entry
  const entryPrices = entryIds.map((entryId) =>
    useReadContract({
      address: contestAddress as `0x${string}`,
      abi: ContestContract.abi,
      functionName: "calculateEntryPrice",
      args: [BigInt(entryId)],
      chainId,
      query: {
        enabled: enabled && !!contestAddress && !!entryId,
      },
    })
  );

  // Read user's ERC1155 token balances for each entry
  const userBalances = entryIds.map((entryId) =>
    useReadContract({
      address: contestAddress as `0x${string}`,
      abi: ContestContract.abi,
      functionName: "balanceOf",
      args: [userAddress as `0x${string}`, BigInt(entryId)],
      chainId,
      query: {
        enabled: enabled && !!contestAddress && !!userAddress && !!entryId,
      },
    })
  );

  // Read net position (total supply) for each entry
  const entrySupplies = entryIds.map((entryId) =>
    useReadContract({
      address: contestAddress as `0x${string}`,
      abi: ContestContract.abi,
      functionName: "netPosition",
      args: [BigInt(entryId)],
      chainId,
      query: {
        enabled: enabled && !!contestAddress && !!entryId,
      },
    })
  );

  // Format the data for easier consumption
  const entryData = entryIds.map((entryId, index) => {
    const price = entryPrices[index].data as bigint | undefined;
    const balance = userBalances[index].data as bigint | undefined;
    const supply = entrySupplies[index].data as bigint | undefined;

    // Calculate implied winnings if this entry wins
    // Formula: (userBalance / totalSupply) * totalCollateral
    let impliedWinnings = 0n;
    let impliedWinningsFormatted = "0";

    if (
      balance &&
      balance > 0n &&
      supply &&
      supply > 0n &&
      totalSpectatorCollateral &&
      totalSpectatorCollateral > 0n
    ) {
      impliedWinnings = (balance * (totalSpectatorCollateral as bigint)) / supply;
      impliedWinningsFormatted = formatUnits(impliedWinnings, 18);
    }

    return {
      entryId,
      price: price || 0n,
      priceFormatted: price ? formatUnits(price, 6) : "0", // Price uses 6 decimals (PRICE_PRECISION = 1e6)
      balance: balance || 0n,
      balanceFormatted: balance ? formatUnits(balance, 18) : "0",
      totalSupply: supply || 0n,
      totalSupplyFormatted: supply ? formatUnits(supply, 18) : "0",
      impliedWinnings,
      impliedWinningsFormatted,
      hasPosition: balance ? balance > 0n : false,
      isLoadingPrice: entryPrices[index].isLoading,
      isLoadingBalance: userBalances[index].isLoading,
      isLoadingSupply: entrySupplies[index].isLoading,
    };
  });

  const isLoading =
    isLoadingState ||
    entryPrices.some((p) => p.isLoading) ||
    userBalances.some((b) => b.isLoading) ||
    entrySupplies.some((s) => s.isLoading);

  return {
    contestState: contestState as ContestState | undefined,
    canPredict,
    canWithdraw,
    canClaim,
    entryData,
    totalSpectatorCollateral: (totalSpectatorCollateral as bigint) || 0n,
    totalSpectatorCollateralFormatted: totalSpectatorCollateral
      ? formatUnits(totalSpectatorCollateral as bigint, 18)
      : "0",
    isLoading,
  };
}
