# Cut Bot plan

Planning doc for letting a Cut server agent (Cut Bot) join contests and set lineups on a user's behalf. **Phase 1 is the committed scope.** Phases 2–4 are later proposals and are not being built now.

| Phase | Title | Status |
| ----- | ----- | ------ |
| 1 | Delegate to Cut Bot (server signer) | **Committed (building now)** |
| 2 | Connect a messaging platform | **Proposal (later, not committed)** |
| 3 | Reminders | **Proposal (later, not committed)** |
| 4 | Analyze, recommend, and set lineups | **Proposal (later, not committed)** |

Related: [issue #16](https://github.com/MagRelo/cut/issues/16) (API surface for agents). This plan does not change that issue.

---

## Phase 1 — Delegate to Cut Bot (committed)

Give the user a settings toggle that authorizes the Cut server to sign from their wallet, with **no policy limits**. The only spending limit is the USDC balance in the wallet. After consent, the server can submit the same approve-and-join batch the client already sends.

### Verified wallet setup (Base production)

Cut production user wallets are **ZeroDev Kernel v3.1** smart accounts on **EntryPoint 0.7**, owned by the user's Privy embedded EOA. The repo does not name this implementation (it is set in the Privy Dashboard); it was confirmed on-chain from ReferralGraph registrants.

Example deployed user wallet [`0x86aeef767db121ea68bf8d5e2ec144db2e16c33f`](https://basescan.org/address/0x86aeef767db121ea68bf8d5e2ec144db2e16c33f):

- `accountId()`: `kernel.advanced.v0.3.1`
- Implementation (EIP-1967): [`0xBAC849bB641841b44E965fB01A4Bf5F074f84b4D`](https://basescan.org/address/0xBAC849bB641841b44E965fB01A4Bf5F074f84b4D) (Kernel v3.1 account logic)
- EntryPoint: `0x0000000071727De22E5E9d8BAf0edAc6f37da032` (v0.7)
- Root validator: ECDSA validator [`0x845ADb2C711129d4f3966735eD98a9F09fC4cE57`](https://basescan.org/address/0x845ADb2C711129d4f3966735eD98a9F09fC4cE57)
- `ecdsaValidatorStorage` owner: an EOA with no code (the Privy embedded wallet)

Of the first 54 ReferralGraph registrants after factory deploy (block 52166090), 10 were deployed on-chain; all 10 used this same Kernel v3.1 implementation.

The client already treats the smart wallet as the spend address (`client/src/hooks/useEffectiveWalletAddress.ts`) and sends sponsored batches through Privy `SmartWalletsProvider` + Pimlico (`client/src/App.tsx`, `client/src/lib/privySmartWalletPaymaster.ts`). The server already prefers `linked_accounts` of type `smart_wallet` (`server/src/lib/privyUserProvisioning.ts`).

### Consent and settings

- Add a **“Let Cut Bot manage my entries”** switch on the account settings page (`client/src/pages/account/SettingsPage.tsx`).
- Turning it on shows a one-time consent screen, then calls Privy `addSigners` on the **embedded EOA** (not the smart wallet address) with **no `policyIds`**. Privy docs: if `policyIds` is omitted, no policies apply to the signer’s requests.
- Turning it off calls `removeSigners` (revokes all signers on that wallet).
- This is the most permissive option Matt asked for: the server can sign anything the embedded EOA can authorize on the Kernel account, limited only by the wallet’s USDC balance.

### Data model

Record delegation in Prisma (`server/prisma/schema.prisma`), not only in `User.settings` JSON. A dedicated table (for example `BotDelegation`) should store at least:

- `userId`
- embedded EOA address and smart wallet address
- status (`invited` / `active` / `revoked`)
- `delegatedAt`, `revokedAt`, `updatedAt`
- Privy wallet / user identifiers needed to sign later

Keep an append-only **audit log** of bot actions (delegate, revoke, join, lineup submit, errors) with user, contest, tx hash or error, and timestamp.

### Server signing path

Today `server/src/lib/privyClient.ts` is auth and provisioning only; it does not sign.

After delegation, the server uses the Cut authorization key with `@privy-io/node` `createViemAccount`, then `permissionless` `toKernelSmartAccount` at **Kernel v3.1 / EntryPoint 0.7**, and submits the existing **USDC.approve + `ContestController.addPrimaryPosition`** batch through the current Pimlico paymaster (`VITE_PIMLICO_SPONSORSHIP_POLICY_ID` / bundler already used by the client in `useBlockchainTransaction.ts`).

**Do not** use Privy’s `eth_signUserOperation` helper. That API lists Kernel **3.3** account logic (`0xd6CEDDe84be40893d153Be9d467CD6aD37875b28`), not the 3.1 implementation Cut wallets use.

### Privy Dashboard prerequisites

These are ops steps, not code:

1. Confirm wallets run in **TEE (secure-server) execution**. Signers and the policy engine require TEE. **Unverified** from this repo; check the Dashboard.
2. Enable **Server-side access** (User management → Authentication → Advanced).
3. Create an **authorization key** (key quorum). Store the private key in a secrets manager, not a plain env file in git. Privy never holds this key and cannot recover it.
4. Confirm the Dashboard smart-wallet implementation remains Kernel (ZeroDev), matching production.

### Security

A leaked authorization key can move funds from **every wallet that has delegated**. Mitigations for Phase 1: secrets manager (or a key quorum), tight server access, and the audit log. An optional later guardrail is a Privy policy that allowlists only USDC and `ContestController` — not in Phase 1 scope, because this phase is deliberately most-permissive.

The user can revoke at any time with the settings toggle (`removeSigners`).

### Acceptance criteria

- A signed-in user can turn the setting on, complete consent, and the server records `active` delegation with timestamps.
- After delegation, the server can submit approve + `addPrimaryPosition` from that user’s Kernel smart wallet without the user being in the app.
- Turning the setting off calls `removeSigners`, records `revoked`, and the server can no longer sign.
- Failures (policy/TEE/bundler/contract revert) are logged and shown clearly; no silent retries that double-join.
- No change to ContestController, issue #16, or repo visibility.

### Task checklist

- [ ] Dashboard: confirm TEE, enable server-side access, create authorization key, store it in a secrets manager.
- [ ] Prisma: delegation table + audit log; migrate (`server/prisma/schema.prisma`).
- [ ] Client consent + toggle on `SettingsPage.tsx`, calling `useSigners` `addSigners` / `removeSigners` on the embedded EOA.
- [ ] Server: load the authorization key, `createViemAccount` + `toKernelSmartAccount` (v3.1, EP 0.7), send the same batch as `useBlockchainTransaction.ts` via Pimlico.
- [ ] Reuse existing wallet resolution (`privyUserProvisioning.ts`, `useEffectiveWalletAddress.ts`) so joins debit the smart wallet, not the EOA.
- [ ] API to read/update delegation status and to trigger a server-side join for a delegated user.
- [ ] Tests for consent, revoke, and a failed join that does not leave a partial entry.

### Docs

- [Privy add signers](https://docs.privy.io/wallets/using-wallets/signers/add-signers) (`policyIds` optional; address is the embedded wallet)
- [Privy remove signers](https://docs.privy.io/wallets/using-wallets/signers/remove-signers)
- [Privy signers overview](https://docs.privy.io/wallets/using-wallets/signers/overview)
- [Privy TEE migration](https://docs.privy.io/recipes/tee-wallet-migration-guide) (TEE required for signers)
- [Privy smart wallets from the server](https://docs.privy.io/wallets/gas-and-asset-management/gas/ethereum) (`createViemAccount` + `toKernelSmartAccount`)
- [Privy `eth_signUserOperation`](https://docs.privy.io/api-reference/wallets/ethereum/eth-sign-user-operation) (do not use; Kernel 3.3 list only)
- [ZeroDev Kernel versions / ECDSA owner](https://docs.zerodev.app/onboarding/create-a-smart-account)

---

## Phase 2 — Messaging (proposal)

Not in the current build. Sketch only:

- A small adapter so more than one messenger can be added later.
- **Start with Telegram** (official Bot API, DMs and groups, buttons, deep links for account linking).
- **Discord next**, because a Play the Cut Discord already exists (weaker for one-to-one reminders; stronger as a league channel).
- **iMessage** via a relay (Sendblue, LoopMessage, or a self-hosted BlueBubbles-style setup) as a later experiment — best UX for US friend groups, but unofficial and fragile. Apple Messages for Business is official but is not a group-chat bot.
- **SMS / Twilio** as a reach-everyone fallback (no buttons; US A2P 10DLC registration required).
- **XMTP** as an option (wallet-native identity, no extra account-link step). Hosted XMTP shuts down 1 February 2027, so self-hosting would be required.
- Settings “Connect” step: one-time code or deep link binds the Cut account to a chat handle.
- The bot should work in both DMs and a league group chat.

## Phase 3 — Reminders (proposal)

Not in the current build. Sketch only:

- Cron tied to the contest schedule: contest open, 24 hours before lock, 1 hour before lock.
- Nudges for users who have not joined or have no lineup, and for invalid lineups (for example a withdrawn player).
- Per-user quiet hours and reminder preferences.

## Phase 4 — Lineup analysis and auto-set (proposal)

Not in the current build. Sketch only:

- A builder that uses candidates, salaries, odds or projections, and roster rules, plus a pick style (safe, contrarian, or “just pick for me”).
- Send a recommended lineup with short reasons. The user can confirm, ask for edits, or allow auto-set.
- When Phase 1 delegation is on, the bot joins and submits the lineup. Submit should be idempotent and validated, with a clear error on failure.
- After settlement, a results recap.

These later phases can use the API and event items in [issue #16](https://github.com/MagRelo/cut/issues/16) (OpenAPI, `llms.txt`, idempotent lineup submit, webhooks for lock / settle / member status).
