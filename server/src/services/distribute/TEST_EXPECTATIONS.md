# DistributeContest Test Expectations

This document outlines all test cases in `distributeContest.test.ts` and their expected behaviors.

## DistributeContest Function Tests

| Test Title                                                            | Expected Behavior                                                                              |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| should handle no open contests                                        | Returns early, no blockchain calls made                                                        |
| should skip contests that are not in OPEN state on blockchain         | Skips contest, no blockchain calls made                                                        |
| should handle contests with no participants                           | Marks contest as ERROR with "Data integrity error: No lineup found with position '1' (winner)" |
| should handle contests with no lineups                                | Marks contest as ERROR with "Data integrity error: Contest has participants but no lineups"    |
| should handle blockchain transaction failures                         | Marks contest as ERROR with "Processing error: Transaction failed"                             |
| should handle missing contest settings                                | Calls mintRewards with participants and [0] fees                                               |
| should handle case where winner is not in participants list           | Marks contest as ERROR with "Winner with wallet address X is not found in participants list"   |
| should calculate payouts correctly for single winner                  | Calls distribute with [10000, 0] (100% to winner)                                              |
| should handle case-insensitive wallet address matching                | Calls distribute with [10000] (case-insensitive matching works)                                |
| should update contest status to SETTLED after successful distribution | Updates contest to SETTLED with results including payouts, participants, distributeTx, mintTx  |
| should handle database errors gracefully                              | Throws database error                                                                          |
| should handle missing environment variables                           | Returns early with "No contests found" message                                                 |

## CalculatePayouts Function Tests

### Edge Cases

| Test Title                                                                          | Expected Behavior                                                                    |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| should handle empty lineups array                                                   | Throws error "Data integrity error: No lineup found with position '1' (winner)"      |
| should handle empty participants array                                              | Throws error "Winner with wallet address X is not found in participants list"        |
| should handle lineups without position field                                        | Throws error "Data integrity error: Lineup missing position field"                   |
| should handle lineups without user field                                            | Throws error "Data integrity error: Lineup missing user field"                       |
| should handle lineups without walletAddress                                         | Throws error "Data integrity error: Lineup missing walletAddress"                    |
| should handle multiple winners (tie for first place) in small contests              | Returns [5000, 5000, 0] (50% each for 2-way tie in small contests)                   |
| should handle multiple winners (tie for first place) in large contests              | Returns [3500, 3500, 0, ...] (50% each of 70% for 2-way tie in large contests)       |
| should handle tie for second place in large contests                                | Returns [7000, 1000, 1000, 0, ...] (50% each of 20% for 2-way tie)                   |
| should handle tie for third place in large contests                                 | Returns [7000, 2000, 500, 500, 0, ...] (50% each of 10% for 2-way tie)               |
| should handle three-way tie for first place in small contests                       | Returns [3333, 3333, 3333] (33.33% each for 3-way tie, with rounding)                |
| should handle three-way tie for first place in large contests                       | Returns [2333, 2333, 2333, 0, ...] (33.33% each of 70% for 3-way tie, with rounding) |
| should handle ties for multiple positions simultaneously                            | Returns [3500, 3500, 1000, 1000, 0, ...] (ties for both 1st and 2nd place)           |
| should handle case where no lineup has position "1"                                 | Throws error "Data integrity error: No lineup found with position '1' (winner)"      |
| should throw error when winner is not in participants list                          | Throws error "Winner with wallet address X is not found in participants list"        |
| should throw error when first place is not in participants list for large contests  | Throws error "Winner with wallet address X is not found in participants list"        |
| should throw error when second place is not in participants list for large contests | Throws error "Second place with wallet address X is not found in participants list"  |
| should throw error when third place is not in participants list for large contests  | Throws error "Third place with wallet address X is not found in participants list"   |

### Normal Cases

| Test Title                                                                            | Expected Behavior                                                       |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| should correctly identify and payout the winner for small contests (<10 participants) | Returns [10000, 0] (100% to winner for contests with <10 participants)  |
| should correctly payout top 3 for large contests (>=10 participants)                  | Returns [7000, 2000, 1000, 0, ...] (70% to 1st, 20% to 2nd, 10% to 3rd) |
| should handle large contests with missing second place                                | Returns [7000, 0, 1000, 0, ...] (70% to 1st, 10% to 3rd, 2nd gets 0)    |
| should handle large contests with missing third place                                 | Returns [7000, 2000, 0, 0, ...] (70% to 1st, 20% to 2nd, 3rd gets 0)    |
| should handle participants not in lineups                                             | Returns [10000, 0, 0] (winner gets 100% for small contests)             |
| should handle large contests with participants not in lineups                         | Returns [7000, 2000, 1000, 0, ...] (70% to 1st, 20% to 2nd, 10% to 3rd) |

## Tie-Handling Logic

The `calculatePayouts` function now properly handles ties by:

1. **Grouping lineups by position**: All lineups with the same position are grouped together
2. **Splitting payouts equally**: When multiple lineups share the same position, the payout for that position is divided equally among them
3. **Rounding down**: Payouts are calculated using `Math.floor()` to ensure no fractional basis points
4. **Maintaining total payout**: The sum of all payouts still equals the intended total (100% for small contests, 100% for large contests)

### Examples:

- **2-way tie for 1st in small contest**: Each gets 50% (5000 basis points)
- **3-way tie for 1st in large contest**: Each gets 33.33% of 70% (2333 basis points each)
- **2-way tie for 2nd in large contest**: Each gets 50% of 20% (1000 basis points each)
- **Simultaneous ties**: Multiple positions can have ties simultaneously

## Key Error Handling Patterns

1. **Data Integrity Errors**: When a winner is not found in the participants list, the system throws an error and marks the contest as ERROR
2. **Blockchain Errors**: When blockchain transactions fail, the contest is marked as ERROR with the specific error message
3. **Missing Data**: When required data is missing (no position, no user, no walletAddress), the system returns zero payouts
4. **Environment Issues**: When environment variables are missing, the function returns early without processing
5. **Database Errors**: When database operations fail, the error is thrown to the caller
6. **Tie Handling**: Ties are handled gracefully with equal distribution of payouts among tied participants
