# Docker Swarm deployment (dedicated droplet)

Single-node Swarm layout: **nginx** (80/443) → **web** (Hono + static, **2 replicas**). The **`cron-app`** pipeline is **not** run on this stack for now (run it elsewhere, e.g. a Pi or another host — see [`env/cron.env.example`](env/cron.env.example)). **PostgreSQL is hosted outside** the stack; only the **web** tasks connect via `DATABASE_URL`.

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

After you create **`swarm/env/web.env`** and **`nginx.env`** locally (from the `*.example` files), push only those files:

```bash
scp ./swarm/env/web.env ./swarm/env/nginx.env \
  root@157.230.6.6:/opt/cut/swarm/env/
ssh root@157.230.6.6 "chmod 600 /opt/cut/swarm/env/*.env"
```

On the server, **`git clone`** the full repo into **`/opt/cut`** if you prefer a normal checkout there; then you can skip broad **`rsync`** of **`swarm/`** and use **`scp`** for env files only, or **`rsync`** to refresh **`swarm/`** after you change **`stack.yml`** / nginx templates on your laptop.

## 1. One-time on the manager (after step 0)

Step **0** already **`rsync`**’d **`swarm/`** (stack, nginx, scripts, `*.example` files) and **`scp`**’d **`web.env`** / **`nginx.env`** to **`/opt/cut/swarm/env/`** on **157.230.6.6**. SSH in and finish setup there.

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

1. **Env files** — They should already exist at **`swarm/env/web.env`** and **`swarm/env/nginx.env`**. Open them and confirm values (especially **`PRIMARY_HOSTNAME`**, **`LETSENCRYPT_EMAIL`**, **`STACK_NAME`** in `nginx.env`, and **`ALLOWED_ORIGINS`** / **`DATABASE_URL`** in `web.env`; mirror [`server/.env.example`](../server/.env.example) for anything missing). **`ENABLE_CRON=false`** in `web.env` is expected (the stack also forces it). Ensure permissions: **`chmod 600 swarm/env/*.env`**. If a file is missing, copy from the matching **`*.example`** in the same directory.

2. **Cron (off Swarm)**  
   Swarm does **not** run `cron-app`. For another machine, copy [`env/cron.env.example`](env/cron.env.example) → `cron.env` there and run `node dist/src/cron-app.js` (or `pnpm --filter server run start:cron`) with that env — not required on this droplet.

3. **App image and first deploy**  
   Build and push the image from your dev machine (see root `pnpm deploy` / [`docker/build.sh`](../docker/build.sh)). On the droplet, still from **`/opt/cut`**:

   ```bash
   export CUT_APP_IMAGE=your-registry/cut-v2:yourtag   # optional; default is magrelo/cut-v2:latest
   docker stack deploy -c swarm/stack.yml cut
   ```

## 2. Hosted PostgreSQL

- Put the full connection string in **`web.env`**. If you run **`cron-app`** on another host, give that host its own **`DATABASE_URL`** (often the same string as in [`env/cron.env.example`](env/cron.env.example)). Use the provider’s TLS query flags if required (e.g. `?sslmode=require`).
- **Allowlist** each client’s **outbound** IP (droplet for Swarm web; Pi/other host for cron if applicable) on the managed DB firewall if the product supports it.
- **Connection limits:** Swarm runs **two web tasks**; size the provider’s `max_connections` and Prisma pool defaults accordingly (add headroom if a separate cron host also connects).

## 3. Build the client for production (CI or build host)

The app image bakes in Vite output. Before `docker build`, set at least:

- `VITE_API_URL` — public API base, e.g. `https://your-domain.com/api`
- `VITE_PRIVY_APP_ID`, `VITE_TARGET_CHAIN`, `VITE_ORACLE_ADDRESS`, paymaster / PostHog keys as needed (see [`client/.env.example`](../client/.env.example)).

Then run root `pnpm deploy` (or `pnpm client:build && pnpm server:build && docker build …`) so `client/dist` is copied into the image per [`docker/Dockerfile`](../docker/Dockerfile).

## 4. Database migrations (critical with 2 web replicas)

Run **`prisma migrate deploy` exactly once** per release **before or after** rolling out a new image, from **CI or the manager** using the same schema as the new image — **not** from each web container’s entrypoint (two replicas would race).

Example on a machine with the repo and Node/pnpm:

```bash
export DATABASE_URL='postgresql://...'
pnpm --filter server exec prisma migrate deploy
```

(Use the hosted URL and credentials from `web.env`.)

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

- **App logs:** services use the **`json-file`** log driver with rotation (`max-size` / `max-file` in `stack.yml`). Inspect with `docker service logs cut_web`, `docker service logs cut_nginx`.
- **Postgres:** rely on the **managed provider** for backups, PITR, and HA; document their restore drill in your own runbook.

## 7. Operations cheatsheet

| Action | Command / note |
|--------|------------------|
| Deploy / update stack | `export CUT_APP_IMAGE=…` (optional), then `docker stack deploy -c swarm/stack.yml cut` from **repo root** |
| Scale web (default 2) | Edit `stack.yml` `deploy.replicas` under `web`, redeploy |
| Logs | `docker service logs -f cut_web` (etc.) |
| Remove stack | `docker stack rm cut` (does not delete named volumes `cut_certbot-www`, `cut_letsencrypt` unless you prune) |

## 8. Relationship to `docker/`

- [`docker/docker-compose.yml`](../docker/docker-compose.yml) remains for **local Postgres** during development.
- [`docker/Dockerfile`](../docker/Dockerfile) is the **source** for the production image referenced by this stack.
