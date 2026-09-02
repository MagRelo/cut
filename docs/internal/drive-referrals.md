# Drive Play The Cut referrals

You can earn invite-network rewards by sending people to Play The Cut with **your invite code in the URL**. Register a Play The Cut account first, then share your referral link from Account Settings so new signups attach to you in the invite tree.

On-chain `ReferralGraph` registration is separate: cron registers invitees after the inviter is on-chain. Signup does not wait for that.

## Register first

1. Open https://playthecut.com and create an account (Sign in / Create Account).
2. After signup, open **Account Settings** and copy **Share Your Referral Link**. That URL includes your opaque referral code (`User.referralCode`).

If you share a `?ref=` link before your Cut account exists, the visitor still gets an account (organic, under the platform root). They are not attached to you.

## Signup referral attachment

Play The Cut uses an 8-character opaque invite code (not a wallet address). Wallet `0x…` values in `ref` are ignored so a bot cannot attribute signups to an address the owner never published.

`POST /auth/session` looks up `X-Cut-Referral-Code` on `User.referralCode` (exact, case-sensitive). If that code belongs to a Cut user, the new row stores `referredByUserId` and `referrerAddress` (the inviter’s primary wallet on the signup chain when present). The inviter does not need a Privy smart-wallet re-check and does not need to be registered on ReferralGraph yet.

If `ref` is missing, invalid, a self-referral, a wallet address, or not a Cut user, **account creation still succeeds**. After Privy email verification, session provisioning always creates the Cut user. Invite attachment is best-effort.

People who **already** have an account are not re-parented if they later click your link.

Each user gets one code at account creation (existing users are backfilled). Ops can replace a code with `pnpm --filter server run script:reset-referral-code <userId|email|wallet>`. There is no in-app rotation UI. After a reset, already-shared URLs with the old code become organic until someone copies a fresh link.

## How the client captures the referrer

1. The visitor opens any app URL that includes `?ref=` plus an 8-character invite code.
2. The client checks that `ref` matches the invite alphabet (and is not a `0x` address) and stores it in **sessionStorage** for that browser tab (`cut_referral_code`). Case is preserved.
3. The stored code survives in-app navigation even if `?ref=` drops off the URL. Sign-in shows “Referral link detected.”
4. When the visitor **creates their account**, the client sends that code as the `X-Cut-Referral-Code` header, then clears storage.

`ref` works on any path (home, a league join URL, etc.).

## URLs to share

After you have an invite code:

```text
https://playthecut.com/?ref=YOUR_CODE
https://playthecut.com/leagues/join/{inviteCode}?ref=YOUR_CODE
```

League join URLs append the generating admin’s **current** referral code. Codes are case-sensitive.

Do not put your own invite code in `ref` when creating **your** account (self-referral is ignored; you still get an account). Share a `?ref=` link after your account exists if you want credit for the invite.

When someone in your downline wins a contest that has an invite-network fee, rewards walk up to 10 levels from the winner.
