# AGENTS.md

## Cursor Cloud specific instructions

Play The Cut is a pnpm monorepo (`client`, `server`, `packages/*`). The dependency-refresh
step (`pnpm install` + `pnpm run prisma:generate`) runs automatically on VM startup via the
Cloud environment update script. The notes below cover only non-obvious startup/run caveats;
standard scripts live in the root `package.json`.

### Services (dev)
- **Postgres** (required): `pnpm run db:start` (docker compose, `docker/docker-compose.yml`,
  port 5432, user/pass/db all `playthecut`). Stop with `pnpm run db:stop`.
- **Backend API** (required): `pnpm run server:dev` → Hono on port 3000 (`tsx watch`).
- **Frontend** (required): `pnpm run client:dev` → Vite on port 5173; it proxies `/api` → :3000.
- `pnpm run dev` runs backend + frontend together.
- Optional: cron pipeline (`ENABLE_CRON=true` in `server/.env`), Prisma Studio
  (`pnpm run prisma:studio`, :5555), Storybook (`pnpm run client:storybook`, :6006).

### One-time DB setup (after `db:start`)
Run `pnpm run prisma:migrate` then `pnpm run prisma:seed`. The seed inserts the `Sport` rows
(pga-golf, f1, commodities) that the app requires to function — the app is broken without it.
`pnpm run db:reset` tears down + recreates + migrates + seeds in one shot.

### Docker daemon caveat
Docker is preinstalled in the snapshot (configured with the `fuse-overlayfs` storage driver and
`containerd-snapshotter` disabled, which is required for Docker to work in this VM). There is no
systemd, so if `docker ps` fails, start the daemon manually:
`sudo bash -c 'nohup dockerd > /tmp/dockerd.log 2>&1 &'` (then it is usable without `sudo`).

### Environment files
`server/.env` and `client/.env` are copied from the `*.env.example` files. The server throws at
boot unless `DATABASE_URL`, `PRIVY_APP_ID`, `PRIVY_APP_SECRET`, `ORACLE_ADDRESS`, and
`ORACLE_PRIVATE_KEY` are set. In this environment the Privy and oracle values are non-secret
placeholders (enough to boot and serve API/DB data); **real Privy credentials are required for
actual user login/auth flows** and a funded oracle wallet + Base Sepolia RPC for on-chain
contest settlement.

### Logging in during dev (Privy test accounts)
A delegate plays through signed contest, lineup, and send requests
(P-256 `x-cut-*`). See `spec/agent/agents.md`. The browser still gates the user's own actions behind Privy
email OTP login, which is also how the user enables a delegate from Account → Settings → Enable Agent Control. For that browser login, use
Privy **test accounts**:
1. App owner enables it once in the Privy Dashboard: **User management → Authentication →
   Advanced → Enable test accounts** (the app already has `email_auth` on and `localhost:5173`
   in allowed domains).
2. Once enabled, Privy generates a static `test-XXXX@privy.io` email + fixed 6-digit OTP. Fetch
   them with the app secret (no dashboard needed after enabling):
   `GET https://api.privy.io/v1/apps/$PRIVY_APP_ID/test_credentials` (or the Node SDK
   `privy.apps().getTestCredentials(appId)`), authenticating with `PRIVY_APP_ID` /
   `PRIVY_APP_SECRET` from `server/.env`.
3. Log in through the UI by entering that test email and OTP in the Privy modal. The first
   successful login creates the Privy user + the Cut user record with `userType=TEST`
   (`test-…@privy.io`).

Note: the Node SDK's `getTestAccessToken()` (headless token) is rejected here because the app has
`allowed_domains` configured, so use the UI OTP flow above rather than the headless token.

### Exercising the fantasy flow (events, leagues, contests, lineups)
- Delegate play: `pnpm --filter server run script:sign-bot-request` signs a contest list and a lineup
  save. Set `BOT_DELEGATE_PRIVATE_KEY` to the base64 PKCS#8 key from `generateDelegateKey()` and
  `SMART_WALLET` to the Kernel address. The signer must be an active delegate for that wallet.
- Seeding an event: `pnpm --filter server run service:init-event pga-golf <pgaTourId>` pulls a real
  PGA tournament into Postgres and marks it the active event (newest wins). It reads `PGA_API_KEY`
  from the shell env (Prisma auto-loads `.env` for `DATABASE_URL`, but this script does **not**
  load `.env` for other vars), so run it with the env exported.
- Event editability gates contest creation: an event is only joinable when its status is
  `SCHEDULED` (derived from the PGA `tournamentStatus`). Completed tournaments (e.g. `R2026033`,
  PGA Championship) are `COMPLETE` and rejected with "This event has started or finished". Pick an
  upcoming tournament id for a joinable event. Caveat: far-future events (e.g. TOUR Championship
  `R2026060`) can be `SCHEDULED` but have an empty field (0 lineup candidates) until the field is
  published, so the lineup builder needs an upcoming event that already has a field.
- Creating a league is a pure DB write (no chain) and works with just a logged-in Privy user.
- Creating a contest and entering lineups deploy/interact with on-chain contracts (ContestFactory
  / ContestController) on Base Sepolia via the user's Privy smart wallet, so they need gas —
  either a funded wallet or the server paymaster (`POST /api/paymaster`, policy id in `PIMLICO_SPONSORSHIP_POLICY_ID`).
  Without those, contest creation/entry fails at the wallet transaction step.

### Release
`pnpm run deploy` builds and pushes the production image. It also releases
`@playthecut/agent`. A change to the agent source or the agent spec pages bumps the
patch when that version is already on npm or in `npm stage list`, then stages the
new version. If npm rejects the version as already used, publish bumps the patch
and stops; run deploy again to stage the new number. Approve it with
`npm stage approve <id>` before it can be installed. `pnpm run agent:since` lists
commits since the last published agent version. Only commits that touch the agent
source or the agent spec pages ship in the next package. `pnpm run launch` (and
`launch:staging`, plus `scp`/`ssh` to `root@157.230.6.6`) needs the droplet SSH password.
The agent does not have that password. Stop after the image push and give the user
`pnpm run launch`.

### Cron host (Raspberry Pi)
The 5-minute score pipeline runs on the Pi (`docs/operations/cron-pi.md`). Web on the
droplet stays `ENABLE_CRON=false`.

| | |
| --- | --- |
| SSH | `ssh magrelo@100.114.121.5` (Tailscale). Needs `all` permissions from the agent sandbox. |
| Repo | `~/node/cut-v2`, branch `main` |
| Process | `cut-cron` → `node dist/src/cron-app.js`, cwd `server/` |

Non-interactive SSH does not load `~/.bashrc`. `node`, `npm`, and `pm2` are already on
`PATH` (`/usr/bin`). **`pnpm` is not.** It lives at
`/home/magrelo/.local/share/pnpm/pnpm`. Export that before any remote `pnpm` command.
Do not `source server/.env` — Prisma loads it.

Update with a fast-forward of `origin/main`, then install, build, migrate, and restart.
Run `prisma migrate deploy` before `pm2 restart` when `server/prisma/migrations` changed.
Leave the untracked `package-lock.json` on the Pi alone.

```bash
ssh magrelo@100.114.121.5 'set -euo pipefail
export PNPM_HOME="/home/magrelo/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"
cd ~/node/cut-v2
git fetch origin main && git merge --ff-only origin/main
pnpm install && pnpm server:build
cd server && pnpm exec prisma migrate deploy
pm2 restart cut-cron
'
```

### Lint / test
- Server tests: `pnpm --filter server run test:run` (vitest).
- Client lint: `pnpm run client:lint` — currently reports **pre-existing** errors in the
  committed code; these are not environment problems. There is no server lint script.
