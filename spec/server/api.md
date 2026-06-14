# Server API reference (v4)

Base URL: `/api` (e.g. `http://localhost:3000/api`)

## Authentication

Protected routes:

```
Authorization: Bearer <privy_access_token>
X-Cut-Chain-Id: <optional chain id for wallet resolution>
```

---

## Route index

| Prefix | Router file | Status |
|--------|-------------|--------|
| `/health` | `api.ts` | ✅ |
| `/auth` | `auth.ts` | ✅ |
| `/sports` | `sports.ts` | ✅ |
| `/lineups` | `lineups.ts` | ✅ |
| `/contests` | `contest.ts` | ✅ |
| `/userGroups` | `userGroup.ts` | ✅ |
| `/bets` | `bets.ts` | ✅ (flag) |
| `/admin` | `admin.ts` | ✅ staff |
| `/cron` | `cron.ts` | ✅ |
| `/unsubscribe` | `unsubscribe.ts` | ✅ |
| `/tournaments` | `legacy.ts` | ❌ 501 |
| `/lineup` | `legacy.ts` | ❌ 501 |

---

## Health

### `GET /api/health`
No auth. `{ status, service, timestamp }`

---

## Auth (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me` | ✅ | User profile, `lineups` for active event, `userGroups` |
| GET | `/referrals/summary` | ✅ | Referral tree summary |
| PUT | `/update` | ✅ | Update display name |
| PUT | `/settings` | ✅ | Update settings JSON |
| GET | `/contests` | ✅ | User's contest history |

---

## Sports (`/api/sports`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | — | List enabled sports (`SportSummary[]`) |
| GET | `/:sportId/events/active` | — | Active event + status. 404 if none. |
| GET | `/:sportId/events/:eventId/candidates` | — | `{ candidates: Candidate[] }` |

**Active event response:** `{ sport, event, status }` where `event` is `CompetitionEvent` with `metadata` JSON (golf: name, dates, course, round status, etc.).

---

## Lineups (`/api/lineups`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:eventId` | ✅ | User's lineups for event `{ lineups: [...] }` |
| POST | `/:eventId` | ✅ | **Create** a new lineup |
| PUT | `/:lineupId` | ✅ | **Update** an existing lineup |

**POST / PUT body:**
```json
{
  "picks": ["<eventParticipantId>", "..."],
  "name": "optional",
  "prediction": { "type": "winningScore", "value": 142 }
}
```

- `POST` always creates a new row; rejects duplicate roster + prediction combo
- `PUT` updates picks/name/prediction for the given `lineupId`
- Validates via `SportModule.validateRoster`
- `requireEventEditable` / `requireLineupEditable` — blocked after event is live/complete
- Marks side-bet market stale on save

---

## Contests (`/api/contests`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | optional | List contests for an **event** |
| GET | `/:id` | optional | Contest detail (id or contract address) |
| GET | `/:id/timeline` | optional | Score/position timeline |
| POST | `/` | ✅ | Create contest (staff or league admin) |
| POST | `/:id/lineups` | ✅ | Join contest with lineup |
| DELETE | `/:id/lineups` | ✅ | Leave contest |
| POST | `/:id/secondary-participants` | ✅ | Record secondary market participant |

**GET `/` query:**
- `eventId` (required) — was `tournamentId` in legacy
- `chainId` (optional)
- `userGroupId` (optional) — league scope; member required

**POST `/` body:** `eventId`, `name`, `address`, `chainId`, `settings`, optional `userGroupId`, `description`, `endDate`

League contests return **404** to non-members.

---

## Leagues (`/api/userGroups`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | ✅ | Leagues for current user |
| POST | `/` | ✅ | Create league (creator = ADMIN) |
| POST | `/join` | ✅ | Join via invite code |
| GET | `/:id` | ✅ member | League detail + members |
| PUT | `/:id` | ✅ admin | Update name/description |
| DELETE | `/:id` | ✅ admin | Delete league |
| GET | `/:id/contests` | ✅ member | All league contests across events |
| GET | `/:id/members` | ✅ member | Member list |
| POST | `/:id/members` | ✅ admin | Add member |
| DELETE | `/:id/members/:userId` | ✅ | Remove member |
| POST | `/:id/invite` | ✅ admin | Generate invite code |

Client routes use `/leagues/*`; API path remains `/userGroups` for compatibility.

---

## Side bets (`/api/bets`)

Requires `SIDE_BETS_ENABLED=true`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/side/lineup/:lineupId/market` | ✅ | Market + selections for lineup |
| POST | `/side/tickets` | ✅ | Place ticket |
| GET | `/side/tickets` | ✅ | User's tickets (optional filters) |

**Place ticket body:** `lineupId`, `hitsRequired` (2\|3\|4), `topN` (5\|10\|20), `stakeAmount`, optional `transactionHashes`

Response includes `playerIds` (= `eventParticipantIds`) for client compat.

---

## Admin (`/api/admin`)

Staff only (`requireAdmin`).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard` | Ops dashboard. Query: `eventId` or `tournamentId` alias |
| POST | `/contests/lock-eligible` | Batch lock contests |
| GET | `/users` | User list + on-chain balances |
| GET | `/users/:id` | User detail |
| GET | `/bets/side/tournament-report` | Side-bet exposure report |
| POST | `/bets/side/lock` | Lock side-bet markets |
| POST | `/bets/side/settle` | Settle side-bet tickets |
| POST | `/bets/side/close` | Close markets |
| POST | `/test-email` | Send preview email (`mode`: preview kinds) |

---

## Cron (`/api/cron`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/status` | Scheduler enabled + active job names |

---

## Unsubscribe (`/api/unsubscribe`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Marketing unsubscribe (signed token) |

---

## Legacy (501)

`GET|POST|PUT|DELETE /api/tournaments/*` and `/api/lineup/*` return:

```json
{
  "error": "Endpoint unavailable during platform rewrite",
  "message": "Use /api/sports and /api/lineups for the new platform APIs"
}
```

---

## Client mapping

| Client hook / page | API |
|--------------------|-----|
| `useSportsQuery` | `GET /sports` |
| `useActiveEventQuery` | `GET /sports/:sportId/events/active` |
| `useEventCandidatesQuery` | `GET /sports/.../candidates` |
| `useContestsQuery` | `GET /contests?eventId=` |
| `useUserGroupContestsQuery` | `GET /userGroups/:id/contests` |
| Lineup save | `POST /lineups/:eventId` (create) or `PUT /lineups/:lineupId` (update) |
| `useAuth` / `/me` | `GET /auth/me` |
