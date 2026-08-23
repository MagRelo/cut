# Drive Play The Cut referrals

You can earn invite-network rewards by sending people to Play The Cut with **your wallet in the URL**. You must **register a Play The Cut account first**. Until you do, you are not in the referral chain, and links that use your address will fail for new signups.

## Register first

1. Open https://playthecut.com and create an account (Sign in / Create Account).
2. After signup, open **Account Settings** and copy your **Account ID**. That is your Privy smart wallet.
3. Use **only that address** as the referrer. Do not use a random wallet, an EOA, or an address that has never signed up.

Signup checks that `ref` already belongs to a registered Play The Cut user on that chain, and that it is their smart wallet. If it is not registered, the visitor’s account creation fails with “Referrer is not a registered Cut user on this chain.” The site does **not** ignore a bad `ref` and sign them up as organic.

## How the client captures the referrer

Play The Cut does not use a short invite code. The referrer is the Ethereum address in the query string.

1. The visitor opens any app URL that includes `?ref=0x…`.
2. The client checks that `ref` is a valid EVM address, lowercases it, and stores it in **sessionStorage** for that browser tab (`cut_referrer_address`).
3. The stored address survives in-app navigation even if `?ref=` drops off the URL. Sign-in shows “Referral link detected.”
4. When the visitor **creates their account**, the client sends that address as the `X-Cut-Referrer-Address` header, then clears storage.
5. The new user is attached to you as their inviter. People who **already** have an account are not re-parented if they later click your link.

`ref` works on any path (home, a league join URL, etc.).

## URLs to share

After you have an Account ID:

```text
https://playthecut.com/?ref=0xYOUR_SMART_WALLET
https://playthecut.com/leagues/join/{inviteCode}?ref=0xYOUR_SMART_WALLET
```

Checksum casing does not matter; the client lowercases the address.

Do not put your own address in `ref` when creating **your** account (self-referral is rejected). Do not share a `?ref=` link until your account exists.

When someone in your downline wins a contest that has an invite-network fee, rewards walk up to 10 levels from the winner.
