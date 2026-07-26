# Stream Feeds (Cutbot contest commentary)

Play The Cut dual-writes Cutbot contest stories to [GetStream Activity Feeds](https://getstream.io/activity-feeds/docs/javascript/) and reads them in the contest lobby with realtime updates, reactions, and an unread-mentions badge on the Feed tab.

## Roles

| Layer | Responsibility |
| --- | --- |
| Postgres `Contest.commentaryFeed` | Generation state: deltas, hole fingerprints, item history for the next cron pass |
| Stream `contest:{contestId}` | Delivery of Cutbot activities (custom flat feed group) |
| Stream `notification:{userId}` | Mention inbox used only for contest-scoped unread counts on the Feed tab |

Classifier, prompts, and Cursor generation stay in-house. Stream is not the delta baseline.

## Environment

**Server** (`STREAM_FEEDS_ENABLED=true` required to activate):

- `STREAM_API_KEY`
- `STREAM_API_SECRET`

**Client:**

- `VITE_STREAM_API_KEY` (public key; enables client session + token fetch)

## Bootstrap

```sh
pnpm --filter server run script:stream-bootstrap
```

Upserts the `cutbot` Stream user and creates (or returns) the custom **`contest`** feed group via [`getOrCreateFeedGroup`](https://getstream.io/activity-feeds/docs/javascript/feed-groups/):

```ts
await client.feeds.getOrCreateFeedGroup({
  id: "contest",
  default_visibility: "public",
  activity_selectors: [{ type: "current_feed" }],
  custom: { description: "Per-contest Cutbot commentary feed" },
});
```

- Contest posts → `contest:{contestId}`
- Mentions → built-in `notification:{userId}`

Server SDK: `@stream-io/node-sdk`. Client: `@stream-io/feeds-react-sdk`.

### Dashboard permissions

Configure the `contest` group so authenticated users can:

- read / watch the feed
- add / delete their own reactions

and cannot:

- add / update / delete activities
- add comments or comment reactions

Users must be able to read / watch / mark-read their own `notification:{userId}` feed.

## Publish path

After `persistContestFeed`, new items are published via `publishContestFeedItemsToStream`:

1. Resolve `subjects.entryIds` → `ContestLineup.userId`
2. Upsert those Stream users
3. `addActivity` onto `contest:{contestId}` as user `cutbot`, with stable activity `id`
4. When mentions exist: `mentioned_user_ids`, `create_notification_activity: true`, `copy_custom_to_notification: true`, `skip_push: true`

Custom payload includes `contestId`, `storyType`, `priority`, `subjects`, `round`, `generatedAt`.

Stream failures are logged and do not fail the commentary batch.

## API

`GET /api/stream/token` (auth required) upserts the current user in Stream and returns `{ apiKey, token, userId, expiresInSeconds }`.

## Client lobby

- Connected users with Stream configured watch `contest:{contestId}` and render Cutbot posts. Reactions (`like`, `dislike`, `fire`; `enforce_unique`) are implemented but currently hidden via `STREAM_REACTIONS_ENABLED`.
- Guests / Stream-unavailable paths fall back to `Contest.commentaryFeed` JSON (no reactions).
- Feed tab label is `Feed (N)` when the user has N unread notification activities whose `custom.contestId` matches the open contest. Selecting the Feed tab marks those activities read.

## Scripts

```sh
pnpm --filter server run script:stream-bootstrap
pnpm --filter server run script:stream-backfill-contest <contestId>
pnpm --filter server run script:contest-feed <contestId> --write   # also publishes new items when Stream is enabled
```

## Non-goals

User posts, comments, chat, mention chips on contest posts, dedicated Mentions UI, and push notifications are out of scope for this integration.
