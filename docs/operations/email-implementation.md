# Email implementation

Engineering companion to [email-program.md](./email-program.md). Product trigger, audience, and copy live in that spec.

---

## Current state

| Area | Status |
|------|--------|
| Provider | **MailerSend** — `server/src/lib/email/transport.ts` |
| Live send | League contest announcement via `POST /api/contests` + `notifyLeagueMembers` |
| Idempotency | **`EmailSendLog`** — `CONTEST_ANNOUNCEMENT:{contestId}:{userId}` |
| Outbox | PENDING rows flushed after create; cron retries leftovers |
| Prepare | Snapshot on `CompetitionEvent.metadata` at init-event and summary write |
| Player withdrawal | Template + preview only |

---

## Module layout

```
server/src/lib/email/
  index.ts
  transport.ts             # MailerSend
  templates.ts             # wrapEmailHtml
  unsubscribe.ts
  types.ts                 # EmailKind, buildDedupeKey
  sendLog.ts
  prepareEventAnnouncement.ts
  emails/
    contestAnnouncement.ts
    playerWithdrawal.ts
  data/                    # Prisma loaders (no HTML)
  send/contestAnnouncement.ts
  preview/
```

Sport adapters: `server/src/sports/emailContentRegistry.ts` — PGA, F1, and commodities are registered. Unregistered sports use `platformEmailContent` (event name, optional top-level `startDate`/`endDate`, no venue line).

---

## Idempotency (`dedupeKey`)

| Kind | Key pattern |
|------|-------------|
| `CONTEST_ANNOUNCEMENT` | `CONTEST_ANNOUNCEMENT:{contestId}:{userId}` |
| `PLAYER_WITHDRAWAL` | `PLAYER_WITHDRAWAL:{eventId}:{userId}:{playerId}` |

`EmailSendLog.status`: `PENDING` \| `SENT` \| `FAILED` \| `SKIPPED`.

---

## Preview

```bash
pnpm --filter server run script:email-preview contest-announcement
pnpm --filter server run script:email-preview contest-announcement open
```

Kinds: `contest-announcement` \| `player-withdrawal` \| `minimal`

---

## Test send (one address)

Does **not** write `EmailSendLog`.

```bash
pnpm --filter server run script:send-test-email you@example.com contest-announcement
```

**Admin API:** `POST /api/admin/test-email` with `{ "to": "you@example.com", "mode": "contest-announcement" }`. `mode: "preview"` aliases contest-announcement. Default `mode` is `minimal`.

---

## Environment

| Variable | Purpose |
|----------|---------|
| `MAILERSEND_API_KEY` | API token |
| `MAILERSEND_FROM_EMAIL` | Verified sender |
| `MAILERSEND_FROM_NAME` | Display name |
| `APP_PUBLIC_URL` / `PUBLIC_APP_URL` | Logo + link base |
| `EVENT_ID` / `TOURNAMENT_ID` | Override event for preview |
| `JWT_SECRET` | Unsubscribe HMAC (falls back to API key) |

---

## Ops sequence

1. `pnpm run service:init-event pga-golf R{pgaTourId}` — field + announcement snapshot
2. Optional: tournament-summary skill / `script:write-tournament-summary` — refreshes snapshot
3. League admin creates a contest with the email checkbox on
4. Members receive the contest announcement
