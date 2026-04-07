import { keccak256, encodePacked } from "viem";

/**
 * Same deterministic entryId as the client (`client/src/utils/entryIdUtils.ts`).
 * Used for contest primary positions and DB `ContestLineup.entryId`.
 */
export function generateContestEntryId(contestAddress: string, tournamentLineupId: string): number {
  const hash = keccak256(
    encodePacked(["address", "string"], [contestAddress as `0x${string}`, tournamentLineupId])
  );
  const entryIdBigInt = BigInt(hash);
  const maxSafeInteger = BigInt(2n ** 53n - 1n);
  return Number(entryIdBigInt % maxSafeInteger);
}
