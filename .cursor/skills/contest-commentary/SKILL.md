---
name: contest-commentary
description: >-
  Turns Play The Cut PGA contest outlook JSON into concise, entertaining
  broadcast commentary. Use when the user asks for contest commentary, a
  decisive-golfer report summary, Sunday leverage, volatile lineups, consensus
  picks, or a sports-bar/Barstool-style contest update.
---

# Contest Commentary

Produce a roughly 150-word update from the realistic contest outlook report.
The goal is to tell viewers who is in the race, which golfers can separate
lineups, and which entries have the most volatile Sunday roster.

## Workflow

1. Obtain fresh report JSON unless the user supplies a specific report:

   ```sh
   pnpm --filter server exec tsx src/scripts/analyzeDecisiveCandidates.ts <contestId> --simulations 2000 --seed 2026
   ```

2. Save the JSON when needed, then run:

   ```sh
   node .cursor/skills/contest-commentary/scripts/analyze-leverage.mjs <report.json>
   ```

3. Use `contentionLineups` as the analysis cohort. Do not use an arbitrary top
   five or top ten when the report already identifies plausible contenders.

4. Read `highLeveragePlayers` from lowest ownership upward. Ownership is
   measured only among contention lineups. Unique picks are the strongest
   differentiators; golfers owned by one-third or fewer contenders are the
   broader leverage group.

5. Read `volatileLineups`. The score combines each active pick's unowned share
   across the contention cohort and divides by four roster slots. A high score
   means the lineup moves differently from its rivals; it does **not** mean the
   lineup is most likely to win.

6. Use `consensusPlayers` as the flip side: widely shared golfers whose results
   create less separation. Mention at most two when they clarify the race.

7. Write only the commentary unless the user requests the supporting analysis.

## Commentary structure

- About 150 words; acceptable range: 125–175.
- Open with the current leader, nearest challenger, and paid-cut situation.
- Name one or two high-leverage lineups, tying each to its rare golfers.
- Contrast with one consensus angle.
- End with an optimistic reason to keep watching.

## Voice

Use a light Barstool/frat-bro sports-broadcast vibe: conversational, confident,
jokey, and fun. Keep it welcoming and optimistic, never obnoxious.

- Use one or two playful phrases, not a joke in every sentence.
- Prefer plain language: “chaos button,” “lurking,” “has the wheel.”
- Avoid insults, sexual humor, profanity, gambling guarantees, or forced slang.
- Do not call a lineup mathematically alive or eliminated. Say `in the hunt`,
  `outside shot`, `long shot`, or `effectively out`.
- Do not present simulation percentages as precise forecasts. Use them to order
  the story, then speak in conversational tiers.
- Never invent golfers, ownership, scores, lineup names, or holes remaining.
- Distinguish leverage from strength: rare picks create variance; they do not
  automatically make a lineup better.

## Quality check

Before answering, verify:

- Every named lineup is in the report.
- Every golfer is actually owned by the lineup paired with him.
- Ownership denominator is the contention cohort.
- Consensus is described as shared exposure, not “unimportant golf.”
- The opening does not repeat the same standings point twice.
- The ending encourages watching without manufacturing certainty.
