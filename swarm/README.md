# Docker Swarm deployment (dedicated droplet)

Single-node Swarm: **nginx** (80/443) host-routes to **prod** and **staging** on the same stack.

```text
playthecut.com                 → cut_web          (magrelo/cut-v4, 2 replicas)
base-sepolia.playthecut.com    → cut_web-staging  (magrelo/cut-v4-staging, 1 replica)
```

The **`cron-app`** pipeline is **not** run on this stack (run it elsewhere, e.g. a Pi — see [`env/cron.env.example`](env/cron.env.example)). **PostgreSQL is hosted outside**; each web service has its own `DATABASE_URL` (`web.env` vs `web-staging.env`).

Paths in `stack.yml` are relative to the **`swarm/`** directory. **Always run `docker stack deploy` from the directory that contains `swarm/` as a subdirectory** (after step 0 that is **`/opt/cut`** on the droplet, or your local repo root on a laptop):

```bash
docker stack deploy -c swarm/stack.yml cut
```

(`cut` is an example stack name; it prefixes service and volume names.)

## 0. Copy `swarm/` to the droplet (`157.230.6.6`)

From your **local machine**, at the **repository root**:

```bash
ssh root@157.230.6.6 "mkdir -p /opt/cut/swarm/env"
rsync -avz ./swarm/ root@157.230.6.6:/opt/cut/swarm/
```

Create the three manager env files locally from the matching `*.example` files (never commit the real files):

| File | Service |
|------|---------|
| [`env/web.env.example`](env/web.env.example) → `web.env` | `cut_web` (prod) |
| [`env/web-staging.env.example`](env/web-staging.env.example) → `web-staging.env` | `cut_web-staging` |
| [`env/nginx.env.example`](env/nginx.env.example) → `nginx.env` | TLS scripts + nginx |

Push all three:

```bash
scp ./swarm/env/web.env ./swarm/env/web-staging.env ./swarm/env/nginx.env \
  root@157.230.6.6:/opt/cut/swarm/env/
ssh root@157.230.6.6 "chmod 600 /opt/cut/swarm/env/*.env"
```

On the server, **`git clone`** the full repo into **`/opt/cut`** if you prefer a normal checkout there; then you can skip broad **`rsync`** of **`swarm/`** and use **`scp`** for env files only, or **`rsync`** to refresh **`swarm/`** after you change **`stack.yml`** / nginx templates on your laptop.

## 1. One-time on the manager (after step 0)

Step **0** already **`rsync`**’d **`swarm/`** (stack, nginx, scripts, `*.example` files) and **`scp`**’d **`web.env`**, **`web-staging.env`**, and **`nginx.env`** to **`/opt/cut/swarm/env/`** on **157.230.6.6**. SSH in and finish setup there.

```bash
ssh root@157.230.6.6
cd /opt/cut
```

**Install Docker** if the host does not have it yet (Ubuntu example — use [Docker Engine install](https://docs.docker.com/engine/install/ubuntu/) if you prefer CE from Docker’s repo):

```bash
apt update
apt install -y docker.io
systemctl enable --now docker
docker --version
```

**Initialize Swarm** once on this machine. On **DigitalOcean** (and many clouds), **`eth0` has two addresses** (public + VPC, e.g. `157.230.6.6` and `10.10.0.5`). Docker will refuse to guess; pass **`--advertise-addr`** explicitly:

```bash
# See addresses on eth0 (or your primary NIC):
ip -brief addr show

# Typical single-node DO setup: advertise the VPC address
docker swarm init --advertise-addr 10.10.0.5
```

Use your droplet’s **actual** VPC IP if it differs. **Alternative:** `docker swarm init --advertise-addr 157.230.6.6` (public) if you prefer the manager advertised on the public interface. **Do not share** `docker swarm join` tokens or paste them into git — treat them like passwords.

If Swarm is already initialized, skip this block. To reset: `docker swarm leave --force` (destroys the local swarm state).

1. **Env files** — Confirm **`swarm/env/web.env`**, **`web-staging.env`**, and **`nginx.env`**. In `nginx.env`: **`PRIMARY_HOSTNAME`**, **`STAGING_HOSTNAME`**, **`LETSENCRYPT_EMAIL`**, **`STACK_NAME`**. In each web env: **`ALLOWED_ORIGINS`**, **`DATABASE_URL`**, **`OPERATOR_PK`**, **`PRIVY_*`**, **`REFERRAL_GROUP_ID`** (staging uses Sepolia / `base-sepolia.playthecut.com` values). The **`*.env.example`** files are **full inventories** (required uncommented; defaults and optionals commented). Mirror anything else from [`server/.env.example`](../server/.env.example). **`ENABLE_CRON=false`** in both web envs is expected (the stack also forces it). **`chmod 600 swarm/env/*.env`**.

2. **Cron (off Swarm)**  
   Swarm does **not** run `cron-app`. For another machine, copy [`env/cron.env.example`](env/cron.env.example) → `cron.env` there and run `node dist/src/cron-app.js` (or `pnpm --filter server run start:cron`) with that env — not required on this droplet.

3. **App images and first deploy**  
   Build and push from your laptop (`pnpm run deploy` for prod, `pnpm run deploy:staging` for staging — see [`docker/build.sh`](../docker/build.sh)). Then:

   ```bash
   pnpm run launch            # stack deploy; sets CUT_APP_IMAGE, preserves staging image once present
   pnpm run launch:staging    # updates cut_web-staging only
   ```

   Manual deploy on the droplet (from **`/opt/cut`**):

   ```bash
   export CUT_APP_IMAGE=magrelo/cut-v4:yourtag
   export CUT_STAGING_APP_IMAGE=magrelo/cut-v4-staging:yourtag
   docker stack deploy -c swarm/stack.yml cut
   ```

## 2. Hosted PostgreSQL

- Prod and staging each need a **`DATABASE_URL`**: `web.env` and `web-staging.env` (separate databases on the same managed instance; staging DB name must contain `staging`). Prefer a **dedicated PgBouncer pool per database** — see [database connections](../docs/operations/database-connections.md). If you run **`cron-app`** elsewhere, give that host its own URL ([`env/cron.env.example`](env/cron.env.example)).
- **Allowlist** each client’s **outbound** IP (this droplet for both web services; Pi/other for cron) on the managed DB firewall if the product supports it.
- **Connection limits:** Swarm runs **two prod web tasks** plus **one staging** task; size pools accordingly (add headroom for cron / local).

## 3. Build the client (bake-time `VITE_*`)

App images bake Vite output. **`VITE_*` are not** set in Swarm env files.

| Target | Client env | Deploy |
|--------|------------|--------|
| Prod (`cut-v4`) | [`client/.env.production`](../client/.env.example) — e.g. `VITE_API_URL=https://playthecut.com/api` | `pnpm run deploy` |
| Staging (`cut-v4-staging`) | [`client/.env.staging`](../client/.env.staging.example) — e.g. `VITE_API_URL=https://base-sepolia.playthecut.com/api`, `VITE_TARGET_CHAIN=testnet` | `pnpm run deploy:staging` |

Also set `VITE_PRIVY_APP_ID`, `VITE_OPERATOR_ADDRESS`, `VITE_REFERRAL_GROUP_ID`, `VITE_SIDE_BET_STAKE_RECIPIENT`, paymaster / PostHog as needed for that environment.

## 4. Database migrations (critical with 2 web replicas)

Run **`prisma migrate deploy` exactly once** per release **per database** **before or after** rolling out a new image, from **CI or the manager** — **not** from each web container’s entrypoint (replicas would race).

```bash
# Prod
export DATABASE_URL='postgresql://...'   # from web.env (direct URL for migrate, not pgbouncer)
pnpm --filter server exec prisma migrate deploy

# Staging (separate DB)
export DATABASE_URL='postgresql://...'   # from web-staging.env
pnpm --filter server exec prisma migrate deploy
```

## 5. TLS (Let’s Encrypt, HTTP-01)

1. Deploy the stack (defaults to **HTTP-only** [`nginx/http-only.conf`](nginx/http-only.conf) via `stack.yml`).
2. Ensure **DNS** for `PRIMARY_HOSTNAME` points at this droplet.
3. Run:

   ```bash
   ./swarm/scripts/bootstrap-tls.sh
   ```

   This uses **certbot** with **`--cert-name cut`**, so certificate paths match [`nginx/https.conf`](nginx/https.conf) (`/etc/letsencrypt/live/cut/…`).

4. Switch nginx to TLS: **`switch-to-https.sh`** updates `swarm/stack.yml` to use [`nginx/https.conf`](nginx/https.conf) and renames the Swarm config key to **`nginx_site_https`** (configs are immutable in Swarm; a new key avoids deploy errors). Saves a one-time **`stack.yml.bak`**. Then redeploy:

   ```bash
   ./swarm/scripts/switch-to-https.sh
   docker stack deploy -c swarm/stack.yml cut
   ```

5. **Renewal:** on the manager, schedule weekly (or similar):

   ```bash
   /path/to/repo/swarm/scripts/renew-certs.sh
   ```

   Example cron entry:

   ```cron
   0 4 * * 0 /path/to/repo/swarm/scripts/renew-certs.sh >> /var/log/cut-certbot.log 2>&1
   ```

## 6. Logs and backups

- **App logs:** services use the **`json-file`** log driver with rotation (`max-size` / `max-file` in `stack.yml`). Inspect with `docker service logs cut_web`, `docker service logs cut_web-staging`, `docker service logs cut_nginx`.
- **Postgres:** rely on the **managed provider** for backups, PITR, and HA; document their restore drill in your own runbook.

## 7. Staging extras (same stack)

Prod and staging share this droplet, stack, nginx, and cert. Steps **0–1** already place `web-staging.env` on the manager. Staging-specific one-time work:

1. **DNS** — A/AAAA for `base-sepolia.playthecut.com` → `157.230.6.6`.
2. **Postgres** — on the same managed instance as prod:

   ```sql
   CREATE DATABASE playthecut_staging;
   ```

   Grant the app role; create a **staging PgBouncer pool** targeting that DB. Point `web-staging.env` `DATABASE_URL` at the pool (DB/pool name must contain `staging`).

3. **TLS SAN** — after primary cert exists (§5) and DNS resolves:

   ```bash
   ssh root@157.230.6.6
   cd /opt/cut
   ./swarm/scripts/expand-tls-staging.sh
   docker service update --force cut_nginx
   ```

4. **Privy** — allow origin `https://base-sepolia.playthecut.com`.

5. **Seed / migrate** (laptop):

   ```bash
   pnpm run db:push-staging
   # or migrate empty: DATABASE_URL=…playthecut_staging… pnpm run prisma:migrate
   ```

Ongoing deploys (does not touch `cut-v4:latest`):

```bash
pnpm run deploy:staging
pnpm run launch:staging
```

Verify: `curl -s https://base-sepolia.playthecut.com/health` · history: `ssh root@157.230.6.6 'tail /opt/cut/deploy-staging.log'`

`pnpm run launch` (prod) re-deploys the stack but **preserves** the current `cut_web-staging` image.

## 8. Operations cheatsheet

| Action | Command / note |
|--------|------------------|
| Deploy / update prod | `pnpm run launch` (after `pnpm run deploy`), or `export CUT_APP_IMAGE=…` then `docker stack deploy -c swarm/stack.yml cut` from **repo root** |
| Deploy / update staging | `pnpm run deploy:staging` then `pnpm run launch:staging` |
| Push prod DB → staging | `pnpm run db:push-staging` |
| Deploy history (prod) | `ssh root@157.230.6.6 'cat /opt/cut/deploy.log'` |
| Deploy history (staging) | `ssh root@157.230.6.6 'cat /opt/cut/deploy-staging.log'` |
| Running version (prod) | `curl -s https://playthecut.com/health` → `gitSha` |
| Running version (staging) | `curl -s https://base-sepolia.playthecut.com/health` → `gitSha` |
| Scale web (default 2) | Edit `stack.yml` `deploy.replicas` under `web`, redeploy |
| Logs | `docker service logs -f cut_web` / `cut_web-staging` / `cut_nginx` |
| Remove stack | `docker stack rm cut` (does not delete named volumes `cut_certbot-www`, `cut_letsencrypt` unless you prune) |

## 9. Relationship to `docker/`

- [`docker/docker-compose.yml`](../docker/docker-compose.yml) remains for **local Postgres** during development.
- [`docker/Dockerfile`](../docker/Dockerfile) is the **source** for prod (`cut-v4`) and staging (`cut-v4-staging`) images referenced by this stack.
