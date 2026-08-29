# Drive Play The Cut referrals

You can earn invite-network rewards by sending people to Play The Cut with **your wallet in the URL**. Register a Play The Cut account first, then share your invite link so new signups attach to you in the invite tree.

On-chain `ReferralGraph` registration is separate: cron registers invitees after the inviter is on-chain. Signup does not wait for that.

## Register first

1. Open https://playthecut.com and create an account (Sign in / Create Account).
2. After signup, open **Account Settings** and copy your **Account ID**. That is your Privy smart wallet.
3. Use **that address** as the referrer. Prefer the Account ID / smart wallet from the in-app invite link.

If you share a `?ref=` link before your Cut account exists, the visitor still gets an account (organic, under the platform root). They are not attached to you.

## Signup referral attachment

Play The Cut does not use a short invite code. The referrer is the Ethereum address in the query string.

`POST /auth/session` looks up `X-Cut-Referrer-Address` in `UserWallet` on Base or Base Sepolia (case-insensitive). If that wallet belongs to a Cut user, the new row stores `referredByUserId` and `referrerAddress` (the inviter’s primary wallet on the signup chain when present). The inviter does not need a Privy smart-wallet re-check and does not need to be registered on ReferralGraph yet.

If `ref` is missing, invalid, a self-referral, or not a Cut user, **account creation still succeeds**. After Privy email verification, session provisioning always creates the Cut user. Invite attachment is best-effort.

People who **already** have an account are not re-parented if they later click your link.

## How the client captures the referrer

1. The visitor opens any app URL that includes `?ref=0x…`.
2. The client checks that `ref` is a valid EVM address, lowercases it, and stores it in **sessionStorage** for that browser tab (`cut_referrer_address`).
3. The stored address survives in-app navigation even if `?ref=` drops off the URL. Sign-in shows “Referral link detected.”
4. When the visitor **creates their account**, the client sends that address as the `X-Cut-Referrer-Address` header, then clears storage.

`ref` works on any path (home, a league join URL, etc.).

## URLs to share

After you have an Account ID:

```text
https://playthecut.com/?ref=0xYOUR_SMART_WALLET
https://playthecut.com/leagues/join/{inviteCode}?ref=0xYOUR_SMART_WALLET
```

Checksum casing does not matter; the client lowercases the address.

Do not put your own address in `ref` when creating **your** account (self-referral is ignored; you still get an account). Share a `?ref=` link after your account exists if you want credit for the invite.

When someone in your downline wins a contest that has an invite-network fee, rewards walk up to 10 levels from the winner.
