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
The app gates all user actions (build a lineup, enter a contest) behind Privy email OTP login,
so real inbox access is normally needed. For automated/dev login, use Privy **test accounts**:
1. App owner enables it once in the Privy Dashboard: **User management → Authentication →
   Advanced → Enable test accounts** (the app already has `email_auth` on and `localhost:5173`
   in allowed domains).
2. Once enabled, Privy generates a static `test-XXXX@privy.io` email + fixed 6-digit OTP. Fetch
   them with the app secret (no dashboard needed after enabling):
   `GET https://api.privy.io/v1/apps/$PRIVY_APP_ID/test_credentials` (or the Node SDK
   `privy.apps().getTestCredentials(appId)`), authenticating with `PRIVY_APP_ID` /
   `PRIVY_APP_SECRET` from `server/.env`.
3. Log in through the UI by entering that test email and OTP in the Privy modal. The first
   successful login creates the Privy user + the Cut user record.

Note: the Node SDK's `getTestAccessToken()` (headless token) is rejected here because the app has
`allowed_domains` configured, so use the UI OTP flow above rather than the headless token.

### Lint / test
- Server tests: `pnpm --filter server run test:run` (vitest).
- Client lint: `pnpm run client:lint` — currently reports **pre-existing** errors in the
  committed code; these are not environment problems. There is no server lint script.
