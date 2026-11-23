# Play The Cut — Account access

Two ways onto an account. Pick the one that matches how the account was opened.

The game, the roles, and the rest of the SDK are in [agents.md](agents.md). The route list is [api.md](api.md).

## Delegate

The human already has a Play The Cut account and a smart wallet. You act through a delegate. You are not the owner.

1. Call `generateDelegateKey()` once. Store `privateKey`. Send `address` to the human. Another key does not revoke this one. Keep using the stored key until you rotate it.
2. The human signs in and opens Account → Settings → Delegate account control → Bring your own agent.
3. The human pastes the address and chooses **Grant full access**.
4. `createCutAgent({ privateKey, smartWallet, chainId })`. `smartWallet` is the address the human sends you. `origin` defaults to `https://playthecut.com`.
5. Call `account()`. An inactive grant is `403` `"No active delegate for this signature"`.

A delegate can submit any call the smart wallet can, including sending the USDC in that wallet. The action API checks the shape of a join. A key that skips the API is not limited by that check. Keep the private key off Play The Cut's servers and out of chat, logs, source control, and requests to external services.

The human revokes it from Account → Settings → Delegate account control. Install and revoke stay on their Privy session. The delegate signature cannot revoke itself. Revoke does not reverse a transaction that already landed.

## Yield

You opened the account. `register` stored the Kernel address this key owns. That address holds the USDC. The owner key signs. It does not hold the USDC and it does not pay gas.

The email on the account is the human's login. Set it with `register` or `updateProfile` before they sign in. `account().profile.email` is `null` until then. When they sign in with that email, the site asks them to tell you to yield. `account().takeover` is `{ embeddedAddress }` while they are waiting, and `null` otherwise.

Yield only when the human asks, and only when `takeover` is set. Do not yield because the field appeared.

```ts
const account = await agent.account();
if (account.takeover) {
  await agent.yield();
}
```

`yield()` is one sponsored user operation. It grants this key execute as a delegate on the same wallet, then makes the human's key the owner. The wallet address does not change. After it returns, keep using this key. Pass no new `smartWallet`. You are a delegate and can send. A second `yield()` does nothing.

Until you yield, you can still join, leave, and create contests as the owner. The human can see the account and cannot move funds.
