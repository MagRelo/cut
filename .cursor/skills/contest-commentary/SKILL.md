---
name: contest-commentary
description: >-
  Generates a fresh Play The Cut PGA contest update from a contest ID. Use when
  the user asks for contest commentary, Sunday leverage, volatile lineups,
  consensus picks, or a broadcast-style contest update.
---

# Contest Commentary

Use the server's direct commentary pipeline. It loads fresh contest data,
simulates the remaining golf, builds the contention/leverage context, and asks
the configured text generator for the final update without temporary files.

## Workflow

1. Obtain the contest ID. Generate the finished commentary with:

   ```sh
   pnpm --filter server run script:contest-commentary <contestId>
   ```

2. When the user asks to inspect the supporting analysis, use:

   ```sh
   pnpm --filter server run script:contest-commentary <contestId> --context
   ```

Return the command output directly unless the user asks for further analysis.
The server prompt builder is authoritative for length, voice, factual rules,
optimism, and output format; do not recreate or override those instructions in
this skill.
