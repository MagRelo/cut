# Cron overview

See **[README.md](./README.md)** and **[`spec/server/cron.md`](../../../spec/server/cron.md)** for the v4 cron design.

- `scorePipeline` every 5 minutes
- `overviewPipeline` every 20 minutes (golf commentary snapshot)
- in-process `feedWorker` for `CommentaryFeedJob` rows

Enabled when `ENABLE_CRON=true`.
