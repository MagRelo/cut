# DistributeContest Test Expectations

This document outlines all test cases in `distributeContest.test.ts` and their expected behaviors.

## DistributeContest Function Tests

| Test Title                                                            | Expected Behavior                                                                             |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| should handle no open contests                                        | Returns early, no blockchain calls made                                                       |
| should skip contests with non-completed tournaments                   | Skips contest, no blockchain calls made                                                       |
| should skip contests that are not in OPEN state on blockchain         | Skips contest, no blockchain calls made                                                       |
| should handle contests with no participants                           | Calls distribute with empty array, calls mintRewards with empty arrays                        |
| should handle contests with no lineups                                | Marks contest as ERROR with "Data integrity error: Contest has participants but no lineups"   |
| should handle blockchain transaction failures                         | Marks contest as ERROR with "Processing error: Transaction failed"                            |
| should handle missing contest settings                                | Calls mintRewards with participants and [0] fees                                              |
| should handle case where winner is not in participants list           | Marks contest as ERROR with "Winner with wallet address X is not found in participants list"  |
| should calculate payouts correctly for single winner                  | Calls distribute with [10000, 0] (100% to winner)                                             |
| should handle case-insensitive wallet address matching                | Calls distribute with [10000] (case-insensitive matching works)                               |
| should update contest status to SETTLED after successful distribution | Updates contest to SETTLED with results including payouts, participants, distributeTx, mintTx |
| should handle database errors gracefully                              | Throws database error                                                                         |
| should handle missing environment variables                           | Returns early with "No contests found" message                                                |

## CalculatePayouts Function Tests

| Test Title                                                 | Expected Behavior                                                             |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| should handle empty lineups array                          | Returns array of zeros matching participants length                           |
| should handle empty participants array                     | Throws error "Winner with wallet address X is not found in participants list" |
| should handle lineups without position field               | Returns array of zeros (no winner found)                                      |
| should handle lineups without user field                   | Returns array of zeros (no winner found)                                      |
| should handle lineups without walletAddress                | Returns array of zeros (no winner found)                                      |
| should handle multiple winners (tie for first place)       | Returns [10000, 0, 0] (first winner gets 100%)                                |
| should handle case where no lineup has position "1"        | Returns array of zeros (no winner found)                                      |
| should throw error when winner is not in participants list | Throws error "Winner with wallet address X is not found in participants list" |
| should correctly identify and payout the winner            | Returns [10000, 0] (100% to winner)                                           |
| should handle participants not in lineups                  | Returns [10000, 0, 0] (winner gets 100%, others get 0)                        |

## Key Error Handling Patterns

1. **Data Integrity Errors**: When a winner is not found in the participants list, the system throws an error and marks the contest as ERROR
2. **Blockchain Errors**: When blockchain transactions fail, the contest is marked as ERROR with the specific error message
3. **Missing Data**: When required data is missing (no position, no user, no walletAddress), the system returns zero payouts
4. **Environment Issues**: When environment variables are missing, the function returns early without processing
5. **Database Errors**: When database operations fail, the error is thrown to the caller
