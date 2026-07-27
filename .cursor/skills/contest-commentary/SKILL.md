---
name: contest-commentary
description: >-
  Generates a fresh Play The Cut contest update from a contest ID (PGA or
  commodities). Use when the user asks for contest commentary, Sunday leverage,
  volatile lineups, consensus picks, daily commodities recaps, or a
  broadcast-style contest update.
---

# Contest Commentary

Use the server's direct commentary pipeline. It loads fresh contest data,
builds sport-specific analysis context, and asks the configured text generator
for the final update without temporary files.

- **PGA Golf:** simulates remaining golf, builds contention/leverage context
- **Commodities:** end-of-day race + day-mover context (no Monte Carlo in v1)

## Workflow

1. Obtain the contest ID. Generate the finished commentary snapshot with:

   ```sh
   pnpm --filter server run script:contest-commentary <contestId>
   ```

2. When the user asks to inspect the supporting analysis, use:

   ```sh
   pnpm --filter server run script:contest-commentary <contestId> --context
   ```

3. For the PGA story-typed commentary feed (classify / generate / optionally write):

   ```sh
   pnpm --filter server run script:contest-feed <contestId> --classify
   pnpm --filter server run script:contest-feed <contestId>
   pnpm --filter server run script:contest-feed <contestId> --write
   ```

   When Stream Feeds is enabled, `--write` also publishes new items to GetStream.
   See `docs/platform/stream-feeds.md` for bootstrap/backfill.

   Commodities does not ship a rolling feed in v1 — overview only.

Return the command output directly unless the user asks for further analysis.
The server prompt builder is authoritative for length, voice, factual rules,
optimism, and output format; do not recreate or override those instructions in
this skill.

## References

- PGA: `packages/sport-pga-golf/CONTEST_COMMENTARY.md`
- Commodities: `packages/sport-commodities/CONTEST_COMMENTARY.md`
