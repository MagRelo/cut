-- Rename contest timeline period column
ALTER TABLE "ContestLineupTimeline" RENAME COLUMN "roundNumber" TO "periodNumber";

-- Backfill CompetitionEvent.metadata period fields from legacy round fields
UPDATE "CompetitionEvent"
SET metadata = (
  (
    COALESCE(metadata::jsonb, '{}'::jsonb)
    || CASE
      WHEN metadata::jsonb ? 'currentRound' AND NOT metadata::jsonb ? 'currentPeriod'
      THEN jsonb_build_object('currentPeriod', metadata::jsonb->'currentRound')
      ELSE '{}'::jsonb
    END
    || CASE
      WHEN metadata::jsonb ? 'roundDisplay' AND NOT metadata::jsonb ? 'periodDisplay'
      THEN jsonb_build_object('periodDisplay', metadata::jsonb->'roundDisplay')
      ELSE '{}'::jsonb
    END
    || CASE
      WHEN metadata::jsonb ? 'roundStatusDisplay' AND NOT metadata::jsonb ? 'periodStatusDisplay'
      THEN jsonb_build_object('periodStatusDisplay', metadata::jsonb->'roundStatusDisplay')
      ELSE '{}'::jsonb
    END
  ) - 'currentRound' - 'roundDisplay' - 'roundStatusDisplay'
)::json
WHERE metadata IS NOT NULL
  AND (
    metadata::jsonb ? 'currentRound'
    OR metadata::jsonb ? 'roundDisplay'
    OR metadata::jsonb ? 'roundStatusDisplay'
  );

-- Backfill EventParticipant.scoreData currentPeriod from currentRound
UPDATE "EventParticipant"
SET "scoreData" = (
  (
    COALESCE("scoreData"::jsonb, '{}'::jsonb)
    || CASE
      WHEN "scoreData"::jsonb ? 'currentRound' AND NOT "scoreData"::jsonb ? 'currentPeriod'
      THEN jsonb_build_object('currentPeriod', "scoreData"::jsonb->'currentRound')
      ELSE '{}'::jsonb
    END
  ) - 'currentRound'
)::json
WHERE "scoreData" IS NOT NULL
  AND "scoreData"::jsonb ? 'currentRound';
