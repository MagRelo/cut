# Docker Swarm deployment (dedicated droplet)

Single-node Swarm layout: **nginx** (80/443) → **web** (Hono + static, **2 replicas**) and a separate **cron** task (**1 replica**). **PostgreSQL is hosted outside** the stack; only the app containers connect via `DATABASE_URL`.

Paths in `stack.yml` are relative to the **`swarm/`** directory. **Always run `docker stack deploy` from the repository root** so those paths resolve correctly:

```bash
docker stack deploy -c swarm/stack.yml cut
```

(`cut` is an example stack name; it prefixes service and volume names.)

## 1. One-time: Swarm and files on the manager

```bash
docker swarm init   # if not already a swarm
```

On the manager, from your checkout:

1. **TLS / stack metadata (scripts + optional tooling)**  
   Copy [`env/nginx.env.example`](env/nginx.env.example) → `env/nginx.env`, set `PRIMARY_HOSTNAME`, `LETSENCRYPT_EMAIL`, `STACK_NAME`.  
   `chmod 600 env/nginx.env`

2. **Web (2 replicas share this file)**  
   Copy [`env/web.env.example`](env/web.env.example) → `env/web.env`. Fill every variable your server needs (mirror [`server/.env.example`](../server/.env.example)). Use **`ENABLE_CRON=false`** (the stack also forces this in `stack.yml`). Set **`ALLOWED_ORIGINS`** to your real `https://` origin(s).  
   `chmod 600 env/web.env`

3. **Cron (1 replica)**  
   Copy [`env/cron.env.example`](env/cron.env.example) → `env/cron.env`. Typically duplicate `DATABASE_URL`, oracle keys, and PGA/RPC settings from `web.env`. Set **`ENABLE_CRON=true`**.  
   `chmod 600 env/cron.env`

4. **App image**  
   Build and push the image your stack will use (see root `pnpm deploy` / [`docker/build.sh`](../docker/build.sh)). Default image in the stack is `magrelo/cut-v2:latest`. Override when deploying:

   ```bash
   export CUT_APP_IMAGE=your-registry/cut-v2:yourtag
   docker stack deploy -c swarm/stack.yml cut
   ```

## 2. Hosted PostgreSQL

- Put the full connection string in **`web.env`** and **`cron.env`** (often duplicated). Use the provider’s TLS query flags if required (e.g. `?sslmode=require`).
- **Allowlist** the droplet’s **outbound** IP (and any standby nodes) on the managed DB firewall if the product supports it.
- **Connection limits:** you have **two web tasks + one cron**; size the provider’s `max_connections` and Prisma’s pool defaults so you do not exhaust the database.

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

4. Switch nginx to TLS: **`switch-to-https.sh`** updates `swarm/stack.yml` to mount [`nginx/https.conf`](nginx/https.conf) instead of `http-only.conf` (saves a one-time `stack.yml.bak` next to `stack.yml`). Then redeploy:

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

- **App logs:** services use the **`json-file`** log driver with rotation (`max-size` / `max-file` in `stack.yml`). Inspect with `docker service logs cut_web`, `docker service logs cut_cron`, `docker service logs cut_nginx`.
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
