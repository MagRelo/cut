import { keccak256, encodePacked } from "viem";

/**
 * Generate deterministic blockchain entryId from contest address and lineup ID
 *
 * This function creates a unique identifier for a contest entry by hashing the
 * contest address and tournament lineup ID together. The same inputs will always
 * produce the same entryId, making it deterministic and reproducible.
 *
 * @param contestAddress - The contest contract address
 * @param tournamentLineupId - The tournament lineup ID (string UUID)
 * @returns entryId as a number (safe for uint256 in contracts)
 *
 * @example
 * const entryId = generateEntryId(
 *   "0x1234567890abcdef1234567890abcdef12345678",
 *   "cm1a2b3c4d5e6f7g8h9i0j1k"
 * );
 * // Returns: 123456789012345 (deterministic number)
 */
export function generateEntryId(contestAddress: string, tournamentLineupId: string): number {
  // Create deterministic hash using keccak256
  // encodePacked mimics Solidity's abi.encodePacked for consistency
  const hash = keccak256(
    encodePacked(["address", "string"], [contestAddress as `0x${string}`, tournamentLineupId])
  );

  // Convert hash (bytes32) to BigInt
  const entryIdBigInt = BigInt(hash);

  // For JavaScript safety, we take modulo of max safe integer
  // Smart contracts will handle the full BigInt value via viem
  // This ensures the number is safe for JavaScript operations
  const maxSafeInteger = BigInt(2n ** 53n - 1n);
  const safeEntryId = entryIdBigInt % maxSafeInteger;

  return Number(safeEntryId);
}

/**
 * Validate that an entryId matches the expected value for a contest+lineup combination
 *
 * @param entryId - The entryId to validate
 * @param contestAddress - The contest contract address
 * @param tournamentLineupId - The tournament lineup ID
 * @returns true if the entryId matches the generated value
 */
export function validateEntryId(
  entryId: number,
  contestAddress: string,
  tournamentLineupId: string
): boolean {
  const expectedEntryId = generateEntryId(contestAddress, tournamentLineupId);
  return entryId === expectedEntryId;
}
