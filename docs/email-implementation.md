# Email implementation

Engineering companion to [email-program.md](./email-program.md). Product cadence, audiences, and content live in that spec.

---

## Current state

| Area | Status |
|------|--------|
| Provider | **MailerSend** — `server/src/lib/email/transport.ts` |
| Idempotency | **`EmailSendLog`** — `dedupeKey` per send / blast |
| Composers | **5 email kinds** under `server/src/lib/email/emails/` |
| Data loaders | `server/src/lib/email/data/` (Prisma; no HTML) |
| Send orchestration | `server/src/lib/email/send/` + `script:send-blast` |
| Welcome | **Manual** — `script:send-blast welcome` |
| Cron | **Deferred** — manual sends only in v1 |

---

## Module layout

```
server/src/lib/email/
  index.ts                 # public exports
  transport.ts             # MailerSend
  templates.ts             # wrapEmailHtml, buildTestEmailHtml
  escape.ts, styles.ts, appUrl.ts
  types.ts                 # EmailKind, buildDedupeKey
  sendLog.ts               # sendIfNotLogged, hasBroadcastBeenSent

  blocks/
    summary.ts             # tournament summarySections
    cta.ts, contestList.ts, lockCountdown.ts, resultsTable.ts

  emails/
    welcome.ts
    newTournament.ts
    reminderNoContest.ts
    tournamentRecap.ts
    behindTheScenes.ts

  data/                    # Prisma loaders (no HTML)
  send/                    # manual blast orchestration
  preview/                 # fixtures + buildPreviewHtmlByKind

server/src/lib/tournamentSummary.ts
```

---

## Idempotency (`dedupeKey`)

| Kind | Key pattern |
|------|-------------|
| `WELCOME` | `WELCOME:{userId}` |
| `NEW_TOURNAMENT` | `NEW_TOURNAMENT:{tournamentId}` (one blast marker) |
| `REMINDER_NO_CONTEST` | `REMINDER_NO_CONTEST:{tournamentId}:{userId}` |
| `TOURNAMENT_RECAP` | per user `…:{tournamentId}:{userId}` + blast `…:{tournamentId}` |
| `BEHIND_THE_SCENES` | `BEHIND_THE_SCENES:{YYYY-MM}` |

---

## Preview

```bash
pnpm --filter server run script:email-preview new-tournament
pnpm --filter server run script:email-preview open reminder
```

Kinds: `welcome` | `new-tournament` | `reminder` | `recap` | `behind-the-scenes` | `minimal`

---

## Manual sends

```bash
pnpm --filter server run script:send-blast welcome --dry-run

# Tournament-scoped (uses manualActive tournament unless TOURNAMENT_ID is set)
pnpm --filter server run script:send-blast new-tournament --dry-run
pnpm --filter server run script:send-blast reminder --dry-run
pnpm --filter server run script:send-blast recap --dry-run

# Monthly digest
pnpm --filter server run script:send-blast behind-the-scenes --dry-run
```

Add `--force` to bypass blast-level idempotency for `new-tournament`, `recap`, `behind-the-scenes`.

**Smoke test (layout only):** `script:send-test-email`  
**Live preview send:** `POST /api/admin/test-email` with `{ "to": "...", "mode": "preview" }`

---

## Environment

| Variable | Purpose |
|----------|---------|
| `MAILERSEND_API_KEY` | API token |
| `MAILERSEND_FROM_EMAIL` | Verified sender |
| `MAILERSEND_FROM_NAME` | Display name |
| `APP_PUBLIC_URL` / `PUBLIC_APP_URL` | Logo + link base |
| `TOURNAMENT_ID` | Override tournament for blast scripts |
| `BTS_EMAIL_BODY_HTML` | Optional raw HTML body for Behind the scenes |

---

## Deferred (phase 2)

- [ ] Cron scheduling (Wednesday / Sunday / monthly)
- [ ] Admin UI for blasts and BTS editor
- [ ] Unsubscribe / preferences

See [email-program.md — Open decisions](./email-program.md#open-decisions).
