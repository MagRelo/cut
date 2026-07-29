---
name: prisma-query
description: >-
  Query the Play The Cut Postgres database via Prisma one-shot shell
  commands (no temporary scripts). Use when inspecting or debugging DB
  data, looking up users/contests/lineups/events, checking counts, or
  answering questions that need live database reads.
---

# Prisma Query

Query the DB with one-shot `tsx` against the existing Prisma client. Do **not**
write temporary `.ts` files under `server/` for ad-hoc reads.

## Setup

- CWD: `server/`
- Env: `server/.env` (loaded by `dotenv/config`). `DATABASE_URL` is the default.
- Client: `src/lib/prisma.ts` (`prisma`, `gracefulShutdown`)
- Schema: `server/prisma/schema.prisma` — check model names before querying
- Shell: request network/`all` permissions (DB is often remote)

## Default pattern (read-only)

```sh
pnpm exec tsx -e '
import "dotenv/config";
import { prisma, gracefulShutdown } from "./src/lib/prisma.ts";

async function main() {
  const rows = await prisma.user.findMany({
    take: 5,
    select: { id: true, email: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  console.log(JSON.stringify(rows, null, 2));
}

main().finally(() => gracefulShutdown());
'
```

Run from `server/` (or set `working_directory` to the server package root).

Wrap in `async function main()` — `tsx -e` is CJS and does not support top-level await.

### Tips

- Prefer `select` / `take` — avoid dumping huge rows or JSON blobs.
- Client API is camelCase: `CompetitionEvent` → `prisma.competitionEvent`.
- Print JSON to stdout; summarize results for the user (do not dump huge payloads).
- Always disconnect via `gracefulShutdown()` so the process exits.

## Staging / alternate DB

When the user asks for staging, set `DATABASE_URL` before creating the client:

```sh
pnpm exec tsx -e '
import "dotenv/config";
if (process.env.STAGING_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.STAGING_DATABASE_URL;
}

async function main() {
  const { prisma, gracefulShutdown } = await import("./src/lib/prisma.ts");
  // ...query...
  await gracefulShutdown();
}

main();
'
```

Use dynamic `import()` after overriding `DATABASE_URL` so the client picks up staging.

## Safety

- **Read-only by default.** Do not `create` / `update` / `delete` / `$executeRaw` writes unless the user explicitly asks to mutate data.
- **Never** run destructive Prisma CLI ops (`migrate reset`, `db push --force-reset`, etc.). See `.cursor/rules/prisma-database.mdc` — give the user the command to run themselves.
- Do not print `DATABASE_URL`, passwords, or other secrets.
- Do not commit query scratch files. If a heredoc temp file is unavoidable, delete it in the same turn.

## When a file is OK

Only write a script under `server/src/scripts/` when the user wants a **reusable** operational tool (with a `package.json` script). Ad-hoc investigation stays one-shot.
