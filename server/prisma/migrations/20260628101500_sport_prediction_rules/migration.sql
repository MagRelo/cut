-- AlterTable
ALTER TABLE "Sport" ADD COLUMN "predictionRules" JSONB;

UPDATE "Sport"
SET "predictionRules" = '{"min":1,"max":250,"defaultRandomMin":95,"defaultRandomMax":145}'::jsonb
WHERE "id" = 'pga-golf';

UPDATE "Sport"
SET "predictionRules" = '{"min":1,"max":120,"defaultRandomMin":45,"defaultRandomMax":75}'::jsonb
WHERE "id" = 'f1';

ALTER TABLE "Sport" ALTER COLUMN "predictionRules" SET NOT NULL;

UPDATE "Lineup"
SET "prediction" = jsonb_set("prediction", '{type}', '"winningLineupTotal"')
WHERE "prediction"->>'type' IN ('winningScore', 'winningLineupPoints');
