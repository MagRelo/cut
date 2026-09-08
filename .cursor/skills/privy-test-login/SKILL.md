---
name: privy-test-login
description: >-
  Fetches Play The Cut Privy test-account email and static 6-digit OTP, then
  signs in through the Privy modal in Chrome. Use when logging into localhost,
  opening protected routes (/account, /account/funds), verifying authenticated
  UI, or when the user mentions Privy test accounts, OTP, or agent login.
---

# Privy test-account login

Sign in to local Play The Cut with the dashboard **test account** (static email +
6-digit OTP). Do not use `getTestAccessToken()` — it is rejected because this
app sets `allowed_domains`.

Never put email or OTP in this skill file, the repo, or user-facing chat.

## Fetch credentials

From the repo root:

```sh
node .cursor/skills/privy-test-login/scripts/get-test-credentials.mjs
node .cursor/skills/privy-test-login/scripts/get-test-credentials.mjs --all
```

Default prints `{ "email": "test-…@privy.io", "otpCode": "……" }` (first account).
`--all` prints `{ "accounts": [{ "email", "otpCode" }, ...] }` and exits non-zero
if fewer than four accounts (referral signup-tree e2e). Keep credentials in
tool results only.

The script reads `PRIVY_APP_ID` / `PRIVY_APP_SECRET` from the environment, then
`server/.env`. Test accounts must be enabled in Privy: **User management →
Authentication → Advanced → Enable test accounts**. Multi-user runs need at
least four static test emails.

## Chrome login

Requires Chrome / chrome-devtools MCP. App must be running (`pnpm dev`, client :5173).

1. Run the credentials script. Keep email and OTP in tool results only.
2. Navigate to `http://localhost:5173/connect` (or the protected URL; it
   redirects here).
3. Click **Sign in** (same Privy `login()` as **Create Account**).
4. In the Privy modal / iframe: enter the test email → continue → enter the
   6-digit OTP. Snapshot after each step; use whatever fields appear.
5. Wait until the app leaves `/connect`. Success is a Cut user session, not
   the Privy modal closing.
6. If `/onboarding` appears (`settings.onboardingDismissed === false` on a new
   user), finish or skip only as needed to reach the page under test.

## Do not

- Echo email, OTP, app secret, or access tokens in chat
- Call Privy `getTestAccessToken()`
- Commit credentials or write them into `SKILL.md`
- Use a personal hardcoded OTP skill unless the user explicitly wants secrets
  kept out of the repo (`~/.cursor/skills/`)
