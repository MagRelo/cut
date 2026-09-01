import { readContestState } from "../shared/contractClient.js";
import { ContestState } from "../shared/types.js";

const DEFAULT_RETRIES = 3;
const DEFAULT_DELAY_MS = 1500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Poll latest `state()` until it matches, then return whatever it last read. */
export async function waitForContestState(
  contestAddress: string,
  chainId: number,
  expected: ContestState,
  options?: { retries?: number; delayMs?: number },
): Promise<number> {
  const retries = options?.retries ?? DEFAULT_RETRIES;
  const delayMs = options?.delayMs ?? DEFAULT_DELAY_MS;
  let state = await readContestState(contestAddress, chainId);
  if (state === expected) return state;
  for (let attempt = 1; attempt <= retries; attempt++) {
    await delay(delayMs);
    state = await readContestState(contestAddress, chainId);
    if (state === expected) return state;
  }
  return state;
}
