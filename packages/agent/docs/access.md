# Play The Cut — Account access

One wallet. The Privy Kernel smart wallet holds the USDC. The website spends it with the signed-in Privy session. An agent spends the same address. The agent holds a P-256 key. Play The Cut registers that public key. The agent signs a Privy authorization payload. Play The Cut checks that signature and asks Privy to sign the user operation with the embedded key. Play The Cut does not hold a key that can move funds.

The game, the roles, and the rest of the SDK are in [agents.md](agents.md). The route list is [api.md](api.md).

## Agent creates the account

1. Call `generateDelegateKey()` once. Store `privateKey`.
2. `createCutAgent({ privateKey, chainId })`. Leave `smartWallet` unset.
3. `register({ email, name?, referralCode?, color?, oddsFormat? })`. Use a real email. That address is how the human signs in on the website later. The response `smartWallet` is the Kernel address. The client keeps it.
4. `account()`. Join, leave, and send from that wallet.

The Privy user is `custom_auth` whose id is the public key, and the email is linked on that user at create. `User.email` is that inbox. A missing email is `400` `"A valid email is required"`. An email already on another Cut user or Privy user is `400` with code `EMAIL_ALREADY_BOUND`. The human signs in on the website with that email. The same key keeps join, leave, and send.

## User creates the account

The human signs in with Privy. The account wallet is the Kernel smart wallet. There is no delegate until they paste your `publicKey` in Account → Agents and choose **Grant full access**. The browser adds your key as a signer on their Privy session. After that grant, use `createCutAgent({ privateKey, smartWallet, chainId })` with the Kernel address they send you.

The human chooses **Revoke all agent access** on that screen. `POST /api/bot/delegates/revoke` marks active and pending rows revoking and does not remove the wallet signer. The browser removes every signer. `POST /api/bot/delegates/revoke/confirm` marks them revoked once the wallet no longer lists them. The delegate cannot remove itself. That is how a human removes the key, including a key that created the account.

## What the key signs

The same P-256 key authenticates reads and chain submissions. Chain actions stay prepare-then-sign. The server builds the user operation from the Kernel address and returns the Privy authorization payload. The SDK signs that payload. The server checks the signature against the stored key, asks Privy to sign the user operation, and submits it through the bundler and paymaster.

Sponsored gas uses one allowlist for the agent and the signed-in Privy session. Allowed calls are `createContest` on the contest factory, `approve` of a stored contest and `transfer` on the payment token, the six contest entry and claim functions on a stored contest address, and `installValidations` or `uninstallValidation` on the sender.
