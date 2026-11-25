# Play The Cut — Account access

One wallet. The Privy Kernel smart wallet holds the USDC. The website spends it with the signed-in Privy session. An agent spends the same address. The agent holds a P-256 key. Play The Cut registers that public key. The agent signs a Privy authorization payload. Play The Cut checks that signature and asks Privy to sign the user operation with the embedded key. Play The Cut does not hold a key that can move funds.

The game, the roles, and the rest of the SDK are in [agents.md](agents.md). The route list is [api.md](api.md).

## Human on the web

Sign in with Privy. The account wallet is the Kernel smart wallet. There is no delegate until you add one.

## Agent only

1. Call `generateDelegateKey()` once. Store `privateKey`. The `publicKey` is what you send when a human grants you later.
2. `createCutAgent({ privateKey, chainId })`. Leave `smartWallet` unset.
3. `register({ email?, name?, referralCode?, color?, oddsFormat? })`. The response `smartWallet` is the Kernel address. The client keeps it.
4. `account()`. Join, leave, and send from that wallet.

No email means the Privy user is `custom_auth` whose id is the public key. An email passed to `register` stays pending until `POST /api/auth/claim-email` with `{ email, code }`. The response `email` stays null and `emailPending` is true until that claim. An email already on another Cut user or Privy user is `400` with code `EMAIL_ALREADY_BOUND`. A bearer with no delegate signer gets `403` `"Sign in is required to change this email"`. After `User.email` or `lastLoginAt` is set, changing the email is `403` `"This account already has a login"`. That person signs in and grants the key from Account → Settings → Enable Agent Control.

## Agent first, human later

Register the same way and pass the email. The server mails a 6-digit code and does not link that inbox on Privy yet. The human calls `POST /api/auth/claim-email`, then signs in with the Privy email OTP. The login joins this user, and the Kernel stays the account wallet. After `lastLoginAt` or a claimed email, `updateProfile` cannot change the email.

## Human first, then an agent

The wallet already exists. The human pastes your `publicKey` in Account → Settings → Enable Agent Control and chooses **Grant full access**. The browser adds your key as a signer on their Privy session. After that grant, use `createCutAgent({ privateKey, smartWallet, chainId })` with the Kernel address they send you. Calls match the agent-only path.

The human chooses **Revoke all agent access** on that screen. `POST /api/bot/delegates/revoke` marks active and pending rows revoking and does not remove the wallet signer. The browser removes every signer. `POST /api/bot/delegates/revoke/confirm` marks them revoked once the wallet no longer lists them. The delegate cannot remove itself.

## What the key signs

The same P-256 key authenticates reads and chain submissions. Chain actions stay prepare-then-sign. The server builds the user operation from the Kernel address and returns the Privy authorization payload. The SDK signs that payload. The server checks the signature against the stored key, asks Privy to sign the user operation, and submits it through the bundler and paymaster.

Sponsored gas uses one allowlist for the agent and the signed-in Privy session. Allowed calls are `createContest` on the contest factory, `approve` of a stored contest and `transfer` on the payment token, the six contest entry and claim functions on a stored contest address, and `installValidations` or `uninstallValidation` on the sender.
