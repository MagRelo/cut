/** On-chain `ContestController.state` enum. */
export enum ContestState {
  OPEN = 0,
  ACTIVE = 1,
  LOCKED = 2,
  SETTLED = 3,
  CANCELLED = 4,
}

export type SupportedChainId = 8453 | 84532;

export function isSupportedChainId(chainId: number | null | undefined): chainId is SupportedChainId {
  return chainId === 8453 || chainId === 84532;
}

export function contestStateFromChain(value: unknown): ContestState | undefined {
  if (typeof value === "number" && Number.isInteger(value)) return value as ContestState;
  if (typeof value === "bigint") return Number(value) as ContestState;
  return undefined;
}
