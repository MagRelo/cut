# Emergency Recovery and Referral Root

Advance ContestCatalyst from `b2acd8d` to upstream `4dd88f6`, wire a cold address-only emergency recovery role into every new contest, rebuild the referral graph with that address as tree root, and keep the hot oracle only for lifecycle and referral registration transactions. Existing deployed contest close support will be retired; unallocated payout dust may still reach the hot oracle as allowed.

## Tasks

- [x] Bump ContestCatalyst and regenerate contract artifacts
- [x] Add emergencyRecovery to createContest call sites, settings, and Blockscout verify encoding
- [x] Make emergency recovery the referral root in config and signup/sync paths
- [x] Rebuild referral graph under emergency recovery (fresh group + rematerialize)
- [x] Remove automated legacy close flow and document cold recovery
- [x] Adapt settlement event indexing, tests, env catalogs, and authoritative specs
- [x] Run contract, server, and client verification

## Sepolia deploy (2026-08-02)

| Contract | Address |
|----------|---------|
| MockUSDC (unchanged) | `0x6662473494b64c6aec18E703E839AF26d371f570` |
| ContestFactory | `0xBFe12841571288119Cc2d5553161A7Ad865720dD` |
| ReferralGraph | `0x820bDEe2FB655eFCfaF82971F7e827a5141417bB` |
| RewardCalculator | `0xE2E7184C7Fc5A35Be22c23A87Ca2d7f6E2d6B72c` |

- OPS_ORACLE (hot): `0x3f76535570b1Bb18D454bC7A8B76f2dEE1726AA5`
- Emergency recovery (cold root): `0x15c3DC71f1f7Fd975e6c82Ff84e8bcaC0E4b2acb`
- Fresh `REFERRAL_GROUP_ID` in server/contracts/client/swarm env
- Emergency recovery registered under `REFERRAL_ROOT` (bootstrap tx on Sepolia)
- Open: live rematerialize (`script:rematerialize-referral-graph`, then `--reset-hashes` if needed); fund OPS as needed for ongoing register gas

## Contract integration

- Bump [`contracts/lib/contestCatalyst`](contracts/lib/contestCatalyst) to `4dd88f6eb4bad51cb410cf90095f8b76c16aa840` and regenerate/copy `ContestFactory` and `ContestController` artifacts into [`server/src/contracts`](server/src/contracts) and [`client/src/utils/contracts`](client/src/utils/contracts). Redeploy `ContestFactory` so new contests embed the new controller bytecode.
- Update every factory call to pass the new final `emergencyRecovery` address argument, including [`server/src/scripts/createOnChainContest.ts`](server/src/scripts/createOnChainContest.ts), [`client/src/lib/contestCreation.ts`](client/src/lib/contestCreation.ts), [`client/src/hooks/useContestFactory.ts`](client/src/hooks/useContestFactory.ts), and [`client/src/hooks/useCreateContestSubmission.ts`](client/src/hooks/useCreateContestSubmission.ts). Validate that it is a nonzero EVM address and differs from the hot oracle; persist it in contest settings for visibility.
- Extend Blockscout constructor encoding in [`server/src/services/contest/verifyContestContract.ts`](server/src/services/contest/verifyContestContract.ts) with the 10th `emergencyRecovery` address argument and thread that value through the verify queue caller.
- Add public address-only configuration (`EMERGENCY_RECOVERY_ADDRESS` server/contracts and `VITE_EMERGENCY_RECOVERY_ADDRESS` client), with examples in the server, client, swarm, and contract env catalogs. No recovery private key will be accepted by web or cron.

## Referral custody

- Change [`server/src/lib/referralConfig.ts`](server/src/lib/referralConfig.ts) and referral setup/sync services so the configured emergency-recovery address is registered directly beneath `REFERRAL_ROOT`, and organic users without inviters descend from that cold root. The hot `OPS_ORACLE_PK` remains the authorized signer for `register`/`batchRegister`, but is no longer a graph ancestor or referral-payment recipient.
- Rename misleading `oracleRoot` concepts and bootstrap/register script output to `referralRoot`/emergency recovery semantics across [`server/src/services/referral`](server/src/services/referral) and related scripts/tests.
- Update settlement indexing for the upstream `ReferralNetworkFeeToPrimary` behavior and remove handling/tests for `ReferralNetworkFeeToOracle`; keep indexing actual `ReferralNetworkFeeDistributed` recipients, including the cold root when it appears in the payout chain. Optionally ignore or note `UnallocatedBalanceCleared` dust to the hot oracle.

## Rebuild referral graph

ReferralGraph cannot re-parent existing wallets, so moving the tree root off `OPS_ORACLE` requires a full rebuild rather than an in-place rewrite:

1. Choose a fresh `REFERRAL_GROUP_ID` (and redeploy `ReferralGraph` if the current deployment cannot authorize a clean cutover for that group).
2. Update server/client/swarm/contracts env to the new group id and `EMERGENCY_RECOVERY_ADDRESS`.
3. Bootstrap the cold emergency-recovery address under `REFERRAL_ROOT` via the updated bootstrap script.
4. Rematerialize all users from DB invite edges onto the new graph with [`server/src/scripts/rematerializeReferralGraph.ts`](server/src/scripts/rematerializeReferralGraph.ts) / related sync paths: organics under emergency recovery, invited users under their inviter wallets.
5. Clear or rewrite stale `referralOnchainTxHash` / `referralGroupId` / `referralChainId` markers as needed so cron sync does not treat old-group registrations as complete.
6. Document the cutover runbook in [`docs/platform/referral-network.md`](docs/platform/referral-network.md) and [`docs/operations/wallet-roles-cashflows.md`](docs/operations/wallet-roles-cashflows.md): dry-run rematerialize, live rematerialize, settle-guard checks, and that old-group contests/graphs are abandoned.

## Recovery lifecycle

- Remove `closeContest`/`batchCloseContests` from server services, package scripts, and the five-minute cron pipeline because the address-only cold role cannot sign automated recovery and legacy contests are out of scope.
- Treat `emergencyRecoverFunds()` as an external cold-wallet/multisig operation after expiry. Update lifecycle and operations documentation to explain that the app observes `CLOSED` state but never possesses the recovery key.
- Update authoritative specs and wallet cash-flow docs to show: hot oracle pays gas and receives only permitted unallocated payout dust; cold emergency recovery is the referral root, receives its referral share, and recovers abandoned balances after expiry.

## Verification

- Run Foundry build/tests after the submodule bump, regenerate artifacts, then run focused server referral/settlement tests plus client contest-creation tests.
- Dry-run rematerialize against the new root/group config and confirm organics resolve to emergency recovery rather than `OPS_ORACLE`.
- Run server and client typechecks/builds and lint diagnostics for changed files; verify generated ABI signatures include `emergencyRecovery`, `emergencyRecoverFunds`, `ReferralNetworkFeeToPrimary`, and the updated factory argument.
