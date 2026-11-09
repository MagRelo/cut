# Implicit state machines

An **implicit state machine** is a lifecycle, mode, or flow whose legal states and transitions are encoded across scattered booleans, status strings, nullable fields, timestamps, derived conditions, or ad-hoc `if`s, rather than one explicit state type with named transitions.

A named union that only some readers use still counts when other readers pick a different slice of the same facts. A machine that already has a named enum and one transition function is listed at the end so it is not re-audited.

This audit did not change application code. It read the current tree and named the encodings that are already there.

## How this was searched

A later pass can repeat this:

1. Read `docs/platform/architecture.md` and `spec/server/cron.md` for the project's own words (`CompetitionEvent`, `Contest`, lineup, sport plugin, `EventParticipant`).
2. Read `server/prisma/schema.prisma` for every model that stores `status`, a boolean pointer, a nullable timestamp, or JSON that gates behavior.
3. Search `server/src`, `client/src`, and `packages/sport-*` for `ContestStatus`, `ContestState`, `EventStatus`, `isActive`, `inField`, `pickPopularityLockedAt`, `referralOnchainTxHash`, `EMAIL_SEND_STATUS`, and `useState` piles on submit, lock, and step.
4. Trace each hit across schema, the service that writes it, and the client that reads it. The files that matter most are listed per machine below.
5. Treat `contracts/docs/CONTEST_STATUS_GUIDE.md`, `spec/contracts/architecture.md`, and `contracts/README.md` as claims about the chain, then check them against `server/src/services/shared/types.ts` and the `ContestController` ABI. Solidity for `ContestController` is not in this repo.

Bets are not implemented. There is no `Bet` model and no placement service. The winner pool is `ContestSecondaryParticipant` plus `addSecondaryPosition`. Login lockout columns on `User` (`isVerified`, `loginAttempts`, `lockedUntil`, `verificationCode`) are stored and copied by the legacy migrate script and admin JSON. No server transition function writes them.

---

## Executive summary

Nine implicit machines are worth a decision. Five of them hurt user experience, developer experience, and agent experience together:

1. **Contest database / chain mirror** — Implemented. Paid activate, lock, cancel, and settle update `Contest.status` only after the receipt succeeds and `state()` matches. If the chain is already at that function's target, the next call updates the row and does not send another transaction.
2. **Contest lobby readers** — Implemented. The lobby follows `joinStatus` from `readContestSurfaces`: the chain state when one is present, otherwise the row. Claims open only when the row is `SETTLED`.
3. **Wallet transaction phase** — Implemented. `useBlockchainTransaction` stores one `TxPhase`. Paid enter, leave, wager, claim, withdraw, and send share its labels. A mined transfer is written to `OnchainPayment`, and a failed save retries without a new transaction.
4. **Session readiness** — Implemented. `readSessionPhase` is the gate. A Privy session whose wallet is still connecting stays `needsWallet` and is not sent to Sign in.
5. **Competition event phase** — `EventStatus` is a real union (`SCHEDULED | LIVE | COMPLETE`), but PGA, commodities, and F1 store different inputs, and `CompetitionEvent.isActive` is a second axis. An unrecognized PGA status string stays `SCHEDULED`, so contests do not activate and scores do not sync.

**Implemented.** `readContestSurfaces(dbStatus, chainState?)` in `client/src/lib/contestSurfaces.ts` names the lobby. `joinStatus` is the chain state when one is present, otherwise the row. Lobby phase, entry, the Lineups tab, the timeline, and the Winner Pool follow `joinStatus`. The timeline runs when `joinStatus` is not `OPEN`, and it polls while that status is `ACTIVE` or `LOCKED` and the event is not `COMPLETE`. Claims open only when the row is `SETTLED`. `skew` is a diagnostic (`null` when the row and the chain agree) and is not rendered. The reader does not write `Contest.status`.

`EventLineupsPanel` prints `joinStatus`. `useContestLobbyState` passes the chain `state()` into `useContestTimelineQuery`. `useContestQuery` still polls the lobby payload from the row.

Wallet transactions use `TxPhase` on `useBlockchainTransaction`. The booleans are derived from it. Paid value transfers that had no ledger row are written to `OnchainPayment`. Contest creation is unchanged. `$0` join and leave stay on their API loading.

`readSessionPhase` in `client/src/lib/sessionPhase.ts` names the session. `loading` is `booting`, `needsWallet`, or `syncingProfile`. `user` is set only in `ready`. Protected routes redirect only for `signedOut` and `sessionError`.

---

## Inventory

| Machine | Where it lives | Current encoding | Who it hurts | Decision |
| --- | --- | --- | --- | --- |
| Contest DB / chain mirror | `Contest.status`, `Contest.address`, `Contest.results`, `confirmContestWrite`, `activateContest`, `lockContest`, `settleContest`, `cancelContest` | Free string, nullable address, JSON tx flags, chain enum | UX, DX, AX | Implemented. Writers confirm the receipt and `state()` before the row moves. A chain already at the target updates the row without another transaction. |
| Contest lobby readers | `readContestSurfaces`, `deriveContestLobbyViewModel`, `useContestTimelineQuery`, `useContestSettlementClaims` | `joinStatus` (chain wins), phase from that status, claims from the row | UX, DX, AX | Implemented. The lobby follows `joinStatus`. Claims stay on the row. |
| Wallet transaction phase | `useBlockchainTransaction`, `TxButton`, `OnchainPayment` | `TxPhase`; booleans derived from it. `ENTRY`, `WAGER`, `WITHDRAW`, `REFUND`, `SEND` | UX, DX, AX | Implemented. One phase. Token movements are inserted after a successful receipt. A failed save retries that insert and the domain write. |
| Session readiness | `readSessionPhase`, `AuthContext`, `ProtectedRoute`, `Connect` | `SessionPhase`. `loading` and `user` derived from it | UX, AX | Implemented. A connecting wallet is `needsWallet`. Disconnect and a blocked profile are `signedOut`. |
| Competition event phase | `CompetitionEvent.metadata`, `isActive`, `packages/sport-*/src/status.ts` | Per-sport JSON and a boolean pointer, collapsed to `EventStatus` | UX, DX, AX | Document the raw-input table next to the three `status.ts` files. Do not add a status column. |
| Lineup edit and entry | `getLineupEditBlock`, `EventLineupsPanel`, `useLineupSlotEditor`, `useContestLineupEntry`, `ContestLineup` | Contest `OPEN` vs event `LIVE`/`COMPLETE`; row presence; `SaveStatus`; `pendingAction` | UX, DX | Keep `SaveStatus`. Add `entryPhase` on top of the wallet phase. Document that `ContestLineup.status` does not move. |
| Field membership | `Participant.metadata.inField`, `syncField.ts`, candidate filters | Boolean inside sport-global JSON | UX, DX, AX | Document that `inField` is on `Participant`, not `EventParticipant`. Do not migrate JSON. |
| Referral registration | `User.referralChainId`, `referralGroupId`, `referralOnchainTxHash` | Null hash means pending; `"already_registered"` means synced | DX, AX | Document the column shapes in `docs/platform/referral-network.md`. Do not add a status column. |
| Email delivery | `EmailSendLog.status`, `attempts` | String, schema default `SENT`, code uses `PENDING` | DX, AX | Document the table, including the default. Do not change the default. |
| Contest entry row | `ContestLineup` | Row exists and `entryId` is set or not. `status` is always `"ACTIVE"` | DX, AX | Leave the column. Document the rule. |
| Cron score pipeline | `server/src/cron/scheduler.ts` | Ordered steps plus in-memory `scorePipelineRunning` | DX | Leave it. `spec/server/cron.md` is the table. |
| Golf round submode | `golfPeriodInProgress`, `golfShouldSyncLiveScores` | Period strings plus `currentPeriod >= 401` | DX | Leave the predicates. One comment table is enough. |
| League membership | `UserGroupMember.role`, `UserGroup.inviteCode` | Row presence, role string, nullable code | — | Leave it. |
| Onboarding | `OnboardingPage` `step`, `settings.onboardingDismissed` | Step index 0–6 and a tri-state flag | DX | Leave the index. Share one definition of dismissed. |
| Funds send / receive | `Send.tsx`, `FundPageTab` | Ephemeral tx flags. No persisted lifecycle | UX | Leave the flow. Button copy should use the wallet phase. |
| Commodities day commentary | `needsCommoditiesDayOverview` | Commentary timestamp vs session close | — | Leave it. The predicate is already one function. |

---

## 1. Contest database / chain mirror

**Status: implemented.** `confirmContestWrite` waits for a successful receipt and the expected `state()`. Activate, lock, cancel, and settle update the row after that. Activate adopts chain `ACTIVE` on an `OPEN` row, lock adopts chain `LOCKED` on an `ACTIVE` row, and cancel adopts chain `CANCELLED` without inventing a hash. Chain `SETTLED` is still written only by `settleContest`, after payouts are recorded. $0 contests stay database-only.

**What it controls.** Whether a user can enter, leave, edit a contest lineup, buy winner-pool tickets, and whether cron will activate, lock, or settle. Paid contests (`Contest.address` set) mirror `ContestController`. $0 contests (`address` null, `hasOnchainEscrow` false) use the same status strings with no contract.

**States.** On-chain `ContestState` in `server/src/services/shared/types.ts` is `OPEN = 0`, `ACTIVE = 1`, `LOCKED = 2`, `SETTLED = 3`, `CANCELLED = 4`. The comment says there is no `CLOSED`. The database type is wider:

```ts
export type ContestStatus =
  "OPEN" | "ACTIVE" | "LOCKED" | "SETTLED" | "CANCELLED" | "CLOSED";
```

`CLOSED` is documented there as legacy rows only. Zod in `server/src/schemas/contest.ts` accepts it. Nothing under `server/src` was found that writes `"CLOSED"`. Whether any live row still has it was not checked in the database.

Writers, and the database precondition each one checks:

| Function | Database precondition | Then |
| --- | --- | --- |
| `activateContest` | `status === "OPEN"` and `shouldActivateContest` (event `LIVE`) | $0: set `ACTIVE` even with zero entries. Paid: require at least one `ContestLineup` and an oracle match. Chain `ACTIVE`: set the row and send nothing. Chain `OPEN`: `write.activateContest()`, `confirmContestWrite` expects `ACTIVE`, then set the row. |
| `lockContest` | `status === "ACTIVE"` | $0: set `LOCKED`. Paid: chain `LOCKED` sets the row and sends nothing. Chain `ACTIVE`: `write.lockContest()`, confirm `LOCKED`, then set the row. Not part of the 5-minute cron. Admin/CLI only (`spec/server/cron.md`). |
| `settleContest` | `ACTIVE` or `LOCKED`, and `shouldSettleContest` (event `COMPLETE`) | $0: lock first if `ACTIVE`, then set `SETTLED`. Paid: if chain is `ACTIVE`, call `lockContest` first; if chain is already `SETTLED` and the database is still `ACTIVE` or `LOCKED`, recover without sending settle again; otherwise chain must be `LOCKED`. The settle write goes through `confirmContestWrite` and expects `SETTLED`. |
| `cancelContest` | Refuse database `SETTLED` or `CLOSED` | Paid: refuse chain `SETTLED`. Chain `CANCELLED`: set the row, keep existing `results`, record `alignedToChain`, send nothing. Otherwise `write.cancelContest()`, confirm `CANCELLED`, then set the row. |

`confirmContestWrite` calls `waitForTransactionReceipt` and then `waitForContestState`. A reverted receipt or a state that never matches throws, and the row stays put. `settleContest` can still recover a chain-`SETTLED` / database-`ACTIVE|LOCKED` pair by searching `ContestSettled` logs (`findSettleTransactionReceipt`, lookback `100_000` blocks).

Other fields change behavior without changing `status`:

- `address == null` means no escrow (`hasOnchainEscrow`).
- `pickPopularityLockedAt == null` and status not `OPEN`: `updateContestLineupsForEvent` snapshots popularity and sets the timestamp. `OPEN` contests never snapshot. Registered sports use popularity weight 0. The timestamp still gets set once a score pass runs after the contest leaves `OPEN`.
- `results` JSON (`ContestResults` in `types.ts`): `settleTx`, `pushPrimaryTxs`, `pushSecondaryTxs`, `pushPayoutsError`. `pushPayoutsError` means the chain settle can already have succeeded while a push step did not. Cron will not settle again once status is `SETTLED`. A retry script exists at `server/src/scripts/pushContestPayouts.ts`.
- `endTime` and `settings.expiryTimestamp` are stored. These services do not read them. `spec/server/cron.md` says permissionless on-chain `cancelExpired` can cancel after expiry plus grace. Nothing in `server/src` calls `cancelExpired`, so the chain can become `CANCELLED` while the row stays `OPEN`, `ACTIVE`, or `LOCKED` until a reader calls `resolveContestStatus`.

`resolveContestStatus` (`server/src/utils/resolveContestStatus.ts`) prefers chain state for action gates and falls back to the database string on RPC failure. $0 contests use the string only. The comment says event status must not be used here.

**Pairs the code can leave behind.** Reachable from the control flow. Not confirmed against production rows.

| Database | Chain | What happens next |
| --- | --- | --- |
| `OPEN` | `ACTIVE` | The receipt mined and the row update had not run. The next `activateContest` sets `ACTIVE` and does not send another transaction. |
| `ACTIVE` | `OPEN` | A row written before confirmation, whose transaction later reverted. New writes do not create this pair. The row is not rolled back. `batchActivateContests` only selects `OPEN`, so cron will not send activate again. |
| `LOCKED` | `ACTIVE` | A row written before confirmation, whose lock transaction later reverted. New writes do not create this pair. The row is not rolled back. `lockContest` requires database `ACTIVE`, so it will not resend. |
| `ACTIVE` or `LOCKED` | `SETTLED` | Recovery inside `settleContest` if the `ContestSettled` log is inside the lookback. Older than that, it refuses. |
| `SETTLED` | not `SETTLED` | `settleContest` refuses because the row is not `ACTIVE` or `LOCKED`. No rewind. |
| `CANCELLED` | still `OPEN` / `ACTIVE` / `LOCKED` | A row written before confirmation, whose cancel transaction later reverted. New writes do not create this pair. The row is not rolled back. The inverse (chain `CANCELLED`, row not) is adopted the next time `cancelContest` runs. Cron does not call it, so `cancelExpired` waits for that call. |
| `CLOSED` | anything | Accepted by types and treated like `SETTLED` for pot display (`server/src/utils/settledPot.ts`) and cancel refusal. Not written by these services. |
| `ACTIVE`, event still `SCHEDULED` | — | `lockContest` does not check event status. Settle still requires `COMPLETE`. |

The lifecycle docs match the ABI. Terminal states are `SETTLED` and `CANCELLED`. `CLOSED` is a legacy database value. The comment next to `ContestStatus` in `server/src/services/shared/types.ts` names the pairs confirmation prevents and the pairs the next call adopts.

Secondary-market timing is also inconsistent across docs. `areSecondaryActionsLocked` treats `OPEN` and `ACTIVE` as open (`types.ts`). `contracts/README.md` says the secondary market is closed in `OPEN`. The Solidity `require` is not in the repo, so which one the bytecode enforces was not verified. The server route that records a secondary buy checks the database string (`!== "OPEN" && !== "ACTIVE"`) and does not call `resolveContestStatus`.

**Why it is implicit.** The four functions are real transitions, and the chain enum is real. The persisted field is an unconstrained string. Chain and database move in two steps. $0 contests skip the chain. Popularity lock and payout push are extra phases inside JSON and a timestamp. `CLOSED` is a sixth name with no writer.

**Failure modes that remain.**

- A chain already at `ACTIVE`, `LOCKED`, or `CANCELLED` is copied onto the row the next time that writer runs. A row already ahead of the chain is not rolled back. Settle still has its own recovery for chain `SETTLED`.
- Two server processes can both see `OPEN` and both send `activateContest`. The in-memory `scorePipelineRunning` flag only guards one process. One transaction reverts and that call leaves the row unchanged. If the successful process dies after the receipt and before the row update, the next activate adopts chain `ACTIVE`.
- A user looking at the contest list sees `contest.status`. Join and leave see `resolveContestStatus`. Those can differ for a whole cron interval, or forever in the stuck pairs above.
- Claims stay hidden while the chain is `SETTLED` and the row is not (`useContestSettlementClaims` checks `contest.status === "SETTLED"`). `CLOSED` does not open claims.

**Decision.** Implemented, as the status line above. There is no Prisma enum and no backfill of `CLOSED`. Nothing copies chain `SETTLED` into the row except `settleContest` after payouts are recorded.

---

## 2. Contest lobby readers

**Status: implemented.** `deriveContestLobbyViewModel` reads `readContestSurfaces`. `deriveContestLobbyPhase` maps `joinStatus`: `OPEN` is `preRound`, `ACTIVE` is `live`, `LOCKED` is `locked`, `SETTLED` or `CLOSED` is `settled`, and anything else is `preRound`. Lineups, the primary action, the timeline, and the Winner Pool follow that phase. `useContestTimelineQuery` enables when `joinStatus` is not `OPEN` and polls while it is `ACTIVE` or `LOCKED` and the event is not `COMPLETE`. `useContestQuery` still polls the lobby payload from the row. `useContestSettlementClaims` uses `claimsOpen`, which is the row `=== "SETTLED"`. `EventLineupsPanel` prints `joinStatus`. `skew` is not rendered.

**What it controls.** Which tab is selected, whether the roster builder shows, whether the timeline query runs, whether the winner pool is wager, locked, claim, or hidden, and whether the lobby polls.

**States the view model already names** (`client/src/types/contestLobby.ts`):

- `ContestLobbyPhase`: `preRound | live | locked | settled`
- `PrimaryTabMode`: `enterContest | liveTimeline`
- `PredictionsPanelMode`: `wager | positions | claim | locked | connectWallet`

`deriveContestLobbyPhase(joinStatus)` maps `SETTLED` or `CLOSED` to `settled`, `LOCKED` to `locked`, `ACTIVE` to `live`, and everything else, including `OPEN` and `CANCELLED`, to `preRound`. A chain state replaces the row, so those names describe `joinStatus`.

`derivePredictionsPanelMode` still short-circuits on phase `settled` to `positions`. `CANCELLED` is `preRound`. Leave is allowed when `joinStatus` is `CANCELLED`.

`ON_CHAIN_TO_STATUS` maps chain value `5` to `"CLOSED"`. `ContestState` has no `5`. `canClaim` checks `=== ContestState.SETTLED`, so a `5` would not claim. `isContestLiveTracked` still polls the lobby payload for a row of `ACTIVE` or `LOCKED`.

`hasWallet` defaults to `true` inside `deriveContestLobbyViewModel` when omitted. `useContestLobbyState` passes the real address. Callers that omit it, including some stories, will not show connect-wallet.

**Why a split remains.** Claims stay on the row because a settled contract is not a recorded payout. `skew` names any other disagreement and is not a gate. `commentaryFeed` (`undefined` vs null vs items) still decides the settled Cutbot tab. `CANCELLED` is still `preRound`.

**Decision.** Implemented, as the status line above. The lobby tests state the status table. They do not pin a second phase computed from the raw row.

---

## 3. Wallet transaction phase

**Status.** Implemented.

**What it controls.** Button copy and double-submit for a wallet transaction. `useBlockchainTransaction` stores one `TxPhase`: `idle | awaitingSignature | confirming | recording | confirmed | chainFailed | recordFailed`. `execute` returns immediately while the phase is `awaitingSignature`, `confirming`, or `recording`. A missing wallet or public client stays `idle` and sets `error`. Sponsorship is still configuration, not a phase.

The old flags are derived: `isSending` is `awaitingSignature`, `isConfirming` is `confirming`, `isProcessing` is any in-flight phase, `isConfirmed` is `confirmed`, `isFailed` is either failure. Contest creation still reads `isSending` and `isConfirming`, so its labels are unchanged. `$0` join, leave, and create do not call `execute`.

`recording` inserts the payment when this transaction moved tokens, then runs `onSuccess`. A thrown `onSuccess` becomes `recordFailed` and keeps the receipt. `retrySave` posts the transfer again and runs `onSuccess` again. It does not send another transaction. Join and leave rethrow the lineup error, so a failed save stays on that lineup until it succeeds.

`TxButton` and `txPhaseLabel` are the shared words: Confirm in wallet, Confirming, Saving, Confirmed, Saving failed. A chain failure shows the action label again. The error sits under the control. Paid enter, leave, wager, claim, withdraw, and send use it. The lineup or row in flight is the one that shows the phase. Send review stays a step before `execute`.

**Ledger.** `OnchainPayment` gained `ENTRY`, `WAGER`, `WITHDRAW`, `REFUND`, and `SEND`. Each row carries the ERC-20 `Transfer` log index. A retry hits `skipDuplicates`. `SEND` writes the sender, and the recipient only when that address is a known user wallet. A claim does not add a second amount: an existing `PRIMARY` or `SECONDARY` row gets the claim hash in `metadata`, and a missing payout row is inserted as that same kind. Contest payouts still list only `PRIMARY`, `SECONDARY`, and `REFERRAL`. Activity reads paid entries, wagers, sends, withdrawals, and refunds from this table. A lineup or winner-pool row still fills a transfer that has no payment yet. Activate, lock, and cancel write nothing here.

**Where one shape does not fit.** Send review, the deposit-price read on Enter, and "Entered in this contest" are not phases. `$0` actions and contest creation stay on their own loading. Claim and withdraw share one hook, so the label belongs to the active entry. A non-smart-wallet batch still moves through signature and confirmation once per call.

---

## 4. Session readiness

**Status.** Implemented.

**What it controls.** Who is signed in, whether protected routes render, and whether the connect screen offers Sign in. `readSessionPhase` in `client/src/lib/sessionPhase.ts` is the gate: `booting | signedOut | needsWallet | syncingProfile | sessionError | ready`. First match wins.

- `booting` — Privy is not ready
- `signedOut` — not authenticated, or `profileBlocked`, or authenticated with no address and Wagmi `disconnected`
- `needsWallet` — authenticated, no address, and Wagmi is still `connecting`, `reconnecting`, or `connected`
- `syncingProfile` — an address is present and `/auth/me` has not returned a profile or an error
- `sessionError` — that fetch failed and there is no profile
- `ready` — a profile is loaded. A later error does not clear it

`loading` is `booting`, `needsWallet`, or `syncingProfile`. `user` is the profile only in `ready`. `serverUserSyncing` is `syncingProfile`. `sessionEnabled` is still the profile-query switch. `ProtectedRoute` and `AdminRoute` redirect only for `signedOut` and `sessionError`. Onboarding runs only from `ready`. Connect says "Finishing sign-in" in `needsWallet` and "Connecting to Play The Cut..." in `syncingProfile`. The splash still covers `loading` with no user, so a late address stays on the splash.

`bootstrapAuthProfile` still branches inside the query: missing `walletAddress` posts `/auth/sync-wallets`; `401 NEEDS_PROVISIONING` posts `/auth/session`; `409 WALLET_NOT_PROVISIONED_FOR_CHAIN` syncs and reloads. Those stay request steps.

**Where one shape does not fit.** A wrong chain still calls `switchChain` and warns. It is not a phase. `balancesUnavailable` stays its own flag so a failed balance read is not an empty wallet. `loginError` is a message on the signed-out screen. `profileBlocked` is `signedOut` even while Privy still says authenticated. That is the 401 teardown. `400` / `403` still set `serverSessionError` and end the Privy session, so Connect can show the reason after the phase is `signedOut`.

---

## 5. Competition event phase

**What it controls.** Whether cron treats an event as current, whether live scores run, and whether contests activate or settle. `EventStatus` in `packages/sport-sdk/src/types.ts` is `SCHEDULED | LIVE | COMPLETE`. It is not a column. Each plugin's `getEventStatus` computes it. The client plugins call the same functions through `eventStatusForSport`.

**Inputs.**

| Sport | Stored inputs | Mapping |
| --- | --- | --- |
| PGA | `CompetitionEvent.metadata` golf `status` string, plus period fields | `COMPLETE` / `COMPLETED` / `OFFICIAL` to `COMPLETE`. `IN_PROGRESS` to `LIVE`. Anything else, including empty and unparsable metadata, to `SCHEDULED`. |
| Commodities | `sessionStarted` and `sessionComplete` latches, plus session open/close times | `sessionComplete` to `COMPLETE` even if `sessionStarted` is false (the commodities status tests allow this). Else `sessionStarted` to `LIVE`. Else `SCHEDULED`. Wall clock does not flip the phase until `syncCommoditiesEventMetadata` writes the flags. The latch does not return to false in that sync. |
| F1 | `classificationComplete`, `raceStart` | `classificationComplete` to `COMPLETE`. Else `now >= raceStart` to `LIVE`. Else `SCHEDULED`. `f1ShouldSyncLiveScores` stays true for `LIVE` and `COMPLETE`. |

**Second axis.** `CompetitionEvent.isActive`. Cron only pipelines `isActive` rows. Init of a new event clears the previous active row unless golf is prepared with `activate: false`.

**Prepared golf event.** `maybePromotePreparedGolfEvent` runs at the start of the score pipeline. If the active golf row is `COMPLETE`, it clears every active golf row and sets the soonest later non-complete row active. Those are two Prisma calls, not one transaction. A crash between them can leave golf with zero `isActive` rows. Several inactive non-complete rows: promotion picks the earliest `startDate` and ignores the others. A prepared row with no parseable `startDate` is skipped. Monday auto-init uses `activate: false` while the active golf event is `LIVE` or `SCHEDULED` (`server/src/services/autoInitEvents.ts`). Commodities does not prepare this way. Auto-init skips when the active commodities event is `LIVE`.

A `COMPLETE` golf event stays `isActive` until promotion or the next activating init. A `SCHEDULED` event can be active with an empty field.

**Golf round, inside `LIVE`.** `golfShouldSyncLiveScores` is true when the raw status is `IN_PROGRESS` and the period display is `"In Progress"`, `"Complete"`, or a playoff (`periodDisplay === "Playoff"` or `currentPeriod >= 401`). `golfPeriodInProgress` is stricter and is what the contest-feed classifier uses. Between rounds the event is `LIVE`, contests can already be `ACTIVE`, scores keep syncing, and feed stories are suppressed. The status comments describe that split as intended. Leave the predicates.

**Candidate row display.** `pickerLiveStatus` in each sport's `CandidateRow.tsx` maps every non-`COMPLETE` status to `LIVE` for the row component. That is a display collapse, not the platform `EventStatus`. Do not treat it as the event machine.

**Score presence.** `EventParticipant` has no status. Lineup math uses `total ?? 0`. The commodities week brief treats `total: null` as no score. Golf field sync inserts `total: 0`, so null means never synced, not "in the field at zero." Document that disagreement. Do not backfill nulls to 0.

**Why it is implicit.** The shared union is explicit. Storage is three shapes plus `isActive`, and "prepared" is `isActive: false` plus a date comparison plus derived status. `golfShouldActivateContest` checks the raw `IN_PROGRESS` string. The cron path uses the mapped `EventStatus`. Those match for the strings the mapper knows, and they both stay false for an unknown PGA string.

**Failure modes.** A new PGA status string leaves the event `SCHEDULED` through a live tournament: no activate, no score sync. Commodities stay `SCHEDULED` after the session opens until a metadata write lands. F1 can go `COMPLETE` once results exist (`results.length > 0` in the F1 metadata sync). How often OpenF1 returns a non-empty list before the race is over was not verified. Promotion and scoring share one pass. If promotion throws, the pipeline still loads whatever is currently active.

**Decision.** Write the raw-input table above into a short comment block at the top of each `packages/sport-*/src/status.ts`, and one paragraph in `spec/server/cron.md` for the `isActive` pointer and the two-update promotion. Do not add an event status column. Do not add a `prepared` status. Wrapping the two promotion updates in a transaction is a later code change, not a schema migration, and it is optional.

**UX.** The week does not silently stay "scheduled" because a new tour string appeared, once an operator can see the raw string and the mapped status side by side. The first step does not change that mapping.

**DX.** Plugin authors see that `LIVE` is not one stored enum.

**AX.** An agent reads metadata through the mapper instead of comparing `metadata.status` to `LIVE`.

**Effort.** Small. First step: the comment table. No behavior change.

---

## 6. Lineup edit and contest entry

**What it controls.** Whether slots can change, whether a lineup can be created, and whether Enter or Leave is on the card.

**Two edit gates, same words.**

- Contest-scoped lineups: `getLineupEditBlock` allows edits only while `resolveContestStatus` is `OPEN`. Event `LIVE` or `COMPLETE` does not lock them. `canEditLineupForContest` is the client side of that rule.
- Unscoped lineups (no `contestId` and no `ContestLineup`): `getEventEditBlock` blocks when event status is `LIVE` or `COMPLETE`.
- Create-contest event picker uses `isEventEditableStatus` (`status !== "LIVE" && status !== "COMPLETE"`) in `client/src/lib/eventMetadata.ts`. Same words, the event gate.

`EventLineupsPanel` passes `isLineupEditable` as both `isEditable` and `isEventEditable`. `LineupContestCard` then requires both. They are one bit, not two gates.

**Slot save** is closer to explicit. `SaveStatus = "idle" | "saving" | "saved"` in `useLineupSlotEditor` and again in `GuestLineupPicker`. The picker is busy when `isSaving || isSaved || savingEventParticipantId`. After a successful save the status stays `saved` through a flash, the slot closes, then it returns to `idle`. Prediction edits are a second flag, `isSavingPrediction`, and that also disables slot actions. Guest local-save is a separate copy of `SaveStatus`. Leave it separate.

**Entry** is row presence. `contestLineup.create` in `server/src/routes/contest.ts` writes `status: "ACTIVE"`. Leave deletes the row. No reader branches on any other `ContestLineup.status`. `entryId` is set for paid entries after the owner check. $0 entries leave `entryId` null. Scoring fills `score`, `baseScore`, `popularityBonus`, and `position`. It does not change `status`.

`pendingAction` is `{ type: "join" | "leave", lineupId, entryId? } | null`, plus `validationError`, `submissionError`, `serverError`, and `warningMessage`, plus the wallet flags from machine 3.

**Why it is implicit.** Editability, the slot flash, the prediction debounce, and the wallet join are independent. The card's two props are one boolean. `ContestLineup.status` looks like a lifecycle and does not move.

**Failure modes.** The stuck paid join in machine 3. Chain leave with no `entryId` sets `submissionError` and sends no transaction (reachable for a server row missing `entryId`). `saveStatus === "saved"` while the slot is already closed during the leave delay. Agents that lock lineups because the event is `LIVE` will lock contest lineups the server still allows, or the reverse for unscoped lineups.

**Decision.** Keep `SaveStatus`. On top of `TxPhase`, add `entryPhase(lineupId)` in `useContestLineupEntry`: `idle | blocked | walletPending | recording | entered | recordFailed`. Point the empty-state label at the join status (machine 2). Document next to `ContestLineup`: entered means the row exists, on-chain means `entryId` is set, and `status` stays `"ACTIVE"`. Do not add entry states. Do not fold the guest picker into the server editor.

**UX.** Enter stays disabled through the server write, and a failed write does not invite a second deposit attempt as if the first never happened.

**DX.** The two edit gates stay two functions (`getContestEditBlock`, `getEventEditBlock`) with their real names. The card stops pretending it has two.

**AX.** "Can I edit?" has one answer per lineup kind, and "did join finish?" has one phase.

**Effort.** Small for `entryPhase` once `TxPhase` exists. Medium if the card props are collapsed. First step: a comment on `getLineupEditBlock` stating the contest-vs-event split, and the `ContestLineup` note. No schema change.

---

## 7. Field membership

**What it controls.** Who appears in the candidate pool, and whether Monday golf init will create an event.

**States.** "Published field" is not stored. `pickNextGolfEvent` keeps a non-complete tournament whose live PGA field has `fieldSize > 0`. Empty field skips auto-init. Manual `initGolfEvent` does not apply that check.

After init, `syncGolfParticipantField` creates `EventParticipant` rows and sets `Participant.metadata.inField` and `isActive`. Players who disappear from the PGA field get `inField: false` on the **Participant** row. They stay linked to the event. The candidate filter in `server/src/sports/pga-golf/handlers.ts` drops `inField === false`. Missing or non-object metadata stays in the pool. F1 does the same in `server/src/sports/f1/syncField.ts` and `handlers.ts`.

`SportModule.handleWithdrawals` is optional. The pipeline calls it when present. PGA and F1 handlers do not pass it. There is no withdrawal status on `EventParticipant`. A withdrawal is "left the field list."

**Why it is implicit.** The init gate is a live API count. Ongoing membership is a boolean inside JSON on the sport-global competitor, shared by every event that competitor appears in.

**Failure modes.** A golfer dropped from this week's field disappears from a later event's pool until that event's field sync sets `inField: true` again. Lineups that already picked them keep the `EventParticipant` row. Unsure how often one golfer is in two stored events at once. The shared metadata blob makes it possible.

**Decision.** Document in `packages/sport-pga-golf` (and the F1 twin) that `inField` is participant-global. A later fix can copy membership onto `EventParticipant` metadata without deleting the old key. Do not migrate existing JSON. Do not invent a withdrawal status.

**UX.** A later event does not silently hide a player who was only withdrawn from the previous one, once membership is per event. The first step does not change the filter.

**DX.** The next field-sync change will not treat `Participant.metadata` as event-scoped.

**AX.** An agent will not read `inField: false` as "this EventParticipant is withdrawn."

**Effort.** Small. First step: the comment. No data rewrite.

---

## 8. Referral registration

**What it controls.** Whether a user is on ReferralGraph before settlement will accept them as a winner, and which parent they get.

**States from columns, not a status field.** Signup writes `referrerAddress`, `referredByUserId`, and `referralRecordedAt`. Cron does not create that edge.

| Stored shape | Meaning |
| --- | --- |
| `referralChainId` or `referralGroupId` null | Not in the sync set |
| Both set, `referralOnchainTxHash` null | Pending. This is the cron query in `batchSyncReferralGraph`. Also the state after `rematerializeReferralGraph` clears hashes. |
| Hash `0x…` | `register` transaction |
| `"already_registered"` (`ALREADY_ON_CHAIN` in `syncReferralGraphUser.ts`) | Already on the contract under the expected parent. Not a transaction hash. |
| `"dry-run"` | Stamped only on a dry run that chooses to stamp. The normal dry-run path skips the stamp. |

`SyncUserOutcome` is explicit in memory: `synced | deferred | failed`. Deferred and failed are not stored. The next cron sees a null hash and tries again. Parent mismatch fails every pass and never stamps. Invitees are not registered under the platform root (`REFUSE_INVITEE_UNDER_PLATFORM_ROOT`).

**Why it is implicit.** Pending is "two columns set and one column null." Synced is either a hash or a magic string. Failure is the absence of a stamp.

**Failure modes.** A permanent parent mismatch retries forever. A mined `register` whose stamp did not land retries. The code then treats "already registered" with the expected parent as success and stamps `already_registered`. Settlement calls `assertWinnerRegisteredOnReferralGraph` before the settle transaction. A winner still pending fails that settle. The exact error string was not re-read.

**Decision.** Add the table above to `docs/platform/referral-network.md`. Do not add a status enum. Do not rewrite hashes. A `lastError` column would be a schema change and is not required to name the machine.

**UX.** A settle that fails because a winner is unregistered can be explained as pending rather than as a contest bug. The first step does not change settle.

**DX.** Cron and settlement share one definition of pending.

**AX.** An agent will not treat a null hash as "no referral," and will not treat `already_registered` as a transaction to replay.

**Effort.** Small. First step: the doc table.

---

## 9. Email delivery

**What it controls.** Contest-announcement sends, and player-withdrawal mail, which uses the same status column and a different `kind`.

**States.** `EMAIL_SEND_STATUS` in `server/src/lib/email/types.ts` is `PENDING | SENT | FAILED | SKIPPED`. `EmailSendLog.status` is a free string whose schema default is `SENT`. Flush loads `PENDING` or `FAILED` with `attempts < 5`. Missing ids become `SKIPPED`. Content missing becomes `FAILED` and increments attempts. Send ok becomes `SENT` and sets `sentAt`. Unsubscribe becomes `SKIPPED`. Other errors become `FAILED`. `createMany` uses `skipDuplicates` on `dedupeKey`. After 5 failures the row stays `FAILED` and is no longer selected.

A row inserted without an explicit status is born `SENT` and will not flush. That is the ambiguous combination.

**Why it is implicit.** Four string statuses, a default that is a terminal state, and the attempt cap as a second gate. `EmailKind` itself is a real TypeScript enum. The send status is not a Prisma enum.

**Failure modes.** A forgotten `status` on insert looks like a successful send. `FAILED` at five attempts looks like "still retrying" if the reader ignores `attempts`.

**Decision.** Document the table in `docs/operations/email-program.md`, including "inserts must set `PENDING`. The column default `SENT` means a row with no status is terminal." Do not change the default. Existing `SENT` rows must stay terminal.

**UX.** Announcement mail either sends or is visibly skipped. The first step does not change send behavior.

**DX.** The default stops being a surprise in the schema.

**AX.** An agent will not enqueue by inserting a row and assuming the default is `PENDING`.

**Effort.** Small. First step: the doc paragraph. No migration.

---

## Machines to leave alone

**Contest entry column.** Covered under lineup edit. Do not grow `ContestLineup.status`.

**Cron score pipeline.** The order is already the spec: promote prepared golf, per active event metadata then field then optional withdrawals then live scores, then `batchActivateContests`, `batchSettleContests`, `batchSyncReferralGraph`, `flushPendingContestAnnouncementEmails`. `scorePipelineRunning` is in-memory, so two processes can overlap. That is an ops limit, not a hidden product lifecycle. Leave the sequence.

**Golf round submode.** Leave `golfPeriodInProgress` and `golfShouldSyncLiveScores`. They are two named predicates with a comment that says why between-rounds differs.

**League membership.** Stranger, `MEMBER`, or `ADMIN`. Join with `inviteCode` inserts `MEMBER`. `inviteCode` null means no self-join until an admin rotates one. Remove deletes the row. The last admin cannot be removed. No pending-invite row. `UserGroupJoinPage` joins once on mount. Leave it. A role string outside `ADMIN` and `MEMBER` would be a member for routes that only check row presence. Unsure any such row exists.

**Onboarding.** `step` is a number clamped to `0..6` in `OnboardingPage`. Dismissal is separate: `OnboardingRedirectGate` redirects only when `settings.onboardingDismissed === false`. `isOnboardingDismissed` uses `Boolean(...)` and is unused by the gate, so a missing key does not redirect, while the helper would say "not dismissed." Leave the step index. If anything changes, make the gate and the helper share `=== false`. A step union would only rename the conditionals.

**Funds.** `FundPageTab` is `deposit | send | activity` from `?tab=`. Receive shows an address. Send is one ERC-20 `transfer` through the wallet hook. No deposit contract and no withdraw lifecycle. Leave it. Button copy should use `TxPhase` when that exists.

**Commodities day commentary.** `needsCommoditiesDayOverview` is one predicate: a settled trading period exists and commentary is missing or older than that day's session close. It runs for `ACTIVE`, `LOCKED`, or `SETTLED` contests on the active event. Leave it.

**User verification columns.** Stored, not transitioned by the app. Leave them until a feature uses them. Do not build a lockout machine for unused columns.

---

## Already explicit

Do not re-audit these as if they had no names.

- **On-chain contest enum.** `ContestState` and the ABI `state()` values 0–4. Transitions are `activateContest`, `lockContest`, `settleContest`, `cancelContest`, `cancelExpired`. Terminal states on-chain are `SETTLED` and `CANCELLED`. There is no `closeContest` in the ABI.
- **Database contest writers.** The four service functions above, with the preconditions in machine 1. They are explicit. The dual write with the chain is the implicit machine.
- **Primary and secondary gates.** `canAddPrimaryPosition` (`OPEN`), `canRemovePrimaryPosition` (`OPEN` or `CANCELLED`), `areSecondaryActionsLocked` (anything other than `OPEN` or `ACTIVE`). Event status is not an input.
- **`EventStatus`.** The union is explicit. The per-sport inputs are machine 5.
- **`contractStateToStatus` and `effectiveContestStatus`.** One direction, chain to string. They do not describe skew.
- **Lobby output unions.** `ContestLobbyPhase`, `PrimaryTabMode`, `PredictionsPanelMode`. The outputs are named. The inputs are machine 2.
- **`getContestParticipationStatus`.** `not-joined | joined | in-progress` from user id, lineup membership, and `ACTIVE|LOCKED`. Leave it.
- **Commentary feed jobs.** `COMMENTARY_FEED_JOB_STATUS` (`pending | running | done | failed`) and `claimNextCommentaryFeedJob` (`FOR UPDATE SKIP LOCKED`) in `server/src/sports/pga-golf/commentary/commentaryFeedJobs.ts`. The column is still a string. The claim function is the transition helper. Stale `running` older than 15 minutes returns to `pending`. Leave it.
- **`SyncUserOutcome`.** In-memory `synced | deferred | failed`. Persistence is machine 8.
- **`EmailKind`.** The kind enum. Send status is machine 9.
- **`PaymentKind`.** `PRIMARY | SECONDARY | REFERRAL`. Classification, not a lifecycle. `OnchainPayment.notifiedAt` is unused outside the legacy migrate script.
- **`FundPageTab`.** `deposit | send | activity`.
- **`SaveStatus`.** `idle | saving | saved` for the slot flash only.

---

## What this pass did not fully trace

Open these on a follow-up. Do not invent the missing states from the names.

- **`ContestController` bytecode.** Not in the repo. Secondary buys during `OPEN`, `cancelExpired` grace, and duplicate `addPrimaryPosition` for the same `entryId` are ABI and doc claims. Confirm against the deployed ABI or the contract repo before changing join retry behavior.
- **Whether any `Contest.status = 'CLOSED'` row exists.** The type allows it. No writer was found. A read-only SQL count would close this. Do not update those rows from this audit.
- **`spec/client/state-management.md`.** Used as orientation. Contest status rules in the platform and contract specs match `types.ts`: terminal states are `SETTLED` and `CANCELLED`, and `CLOSED` is legacy.
- **F1 results timing.** `classificationComplete` follows `results.length > 0`. Confirm against OpenF1 before calling an early `COMPLETE` a bug.
- **`assertWinnerRegisteredOnReferralGraph` error text**, and whether push payouts are idempotent on the contract. Both affect how dangerous a retry is. The recovery paths are named above. The revert strings were not copied.
- **Client sport UI beyond status and candidate rows.** No separate PGA, F1, or commodities wizard state was found. A follow-up that only searches `useReducer` will find nothing. This client has no `useReducer`.
