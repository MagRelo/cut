# Play The Cut Server: Effect Vision

> A comprehensive look at how Effect-TS would transform the server architecture, with particular focus on the data ingestion (Extract-Data-Load) pipelines.

## Table of Contents

1. [Why Effect?](#why-effect)
2. [Core Effect Concepts](#core-effect-concepts)
3. [Current vs Effect Architecture](#current-vs-effect-architecture)
4. [Typed Errors](#typed-errors)
5. [Dependency Injection via Layers](#dependency-injection-via-layers)
6. [Data Ingestion Pipelines (EDL)](#data-ingestion-pipelines-edl)
7. [Sport Plugin Architecture](#sport-plugin-architecture)
8. [API Layer](#api-layer)
9. [Observability & Tracing](#observability--tracing)
10. [Testing](#testing)
11. [Migration Strategy](#migration-strategy)

---

## Why Effect?

The current server has patterns that Effect handles elegantly:

| Current Pain Point | Effect Solution |
|-------------------|-----------------|
| `try/catch` everywhere with `any` errors | Typed error channels |
| Manual dependency passing (Prisma, APIs) | Layer-based DI |
| Implicit failure modes in API calls | `Effect<A, E, R>` types |
| Ad-hoc retry logic | Built-in retry policies |
| Manual resource cleanup | `acquireRelease` patterns |
| Scattered logging | Structured tracing |
| Concurrent fetch coordination | Fiber-based concurrency |

### What Makes Effect Different

```typescript
// Current: You don't know what can fail
async function fetchLeaderboard(): Promise<RawLeaderboard>

// Effect: The type tells you everything
function fetchLeaderboard(): Effect<
  RawLeaderboard,           // Success type
  PgaApiError | RateLimitError | NetworkError,  // Error types
  PgaApiClient | Clock      // Dependencies required
>
```

---

## Core Effect Concepts

### The Effect Type

```typescript
// Effect<Success, Error, Requirements>
type Effect<A, E, R> = // ... runtime definition

// Examples:
Effect<User, NotFoundError, never>          // No dependencies
Effect<void, DatabaseError, Prisma>         // Needs Prisma
Effect<Leaderboard, ApiError, PgaClient>    // Needs PGA client
```

### Services and Context

```typescript
// Define a service interface
class PrismaService extends Context.Tag("PrismaService")<
  PrismaService,
  PrismaClient
>() {}

// Use in an effect
const getUser = (id: string) =>
  Effect.gen(function* () {
    const prisma = yield* PrismaService
    return yield* Effect.tryPromise({
      try: () => prisma.user.findUnique({ where: { id } }),
      catch: (e) => new DatabaseError({ cause: e })
    })
  })
```

### Layers (Dependency Injection)

```typescript
// Layer<Provides, Error, Requires>
const PrismaLive = Layer.succeed(
  PrismaService,
  new PrismaClient()
)

const PgaClientLive = Layer.effect(
  PgaClient,
  Effect.gen(function* () {
    const config = yield* ConfigService
    return new PgaApiClientImpl(config.pgaApiKey)
  })
)

// Compose layers
const MainLive = Layer.mergeAll(
  PrismaLive,
  PgaClientLive,
  ConfigLive
)
```

---

## Current vs Effect Architecture

### Current Server Entry Point

```typescript
// server/src/index.ts (current)
async function startServer() {
  let cronScheduler = null;
  if (process.env.ENABLE_CRON === "true") {
    const { default: CronScheduler } = await import("./cron/scheduler.js");
    cronScheduler = new CronScheduler(true);
    cronScheduler.start();
  }

  serve({ fetch: app.fetch, port: 3000 });

  process.on("SIGTERM", () => {
    cronScheduler?.stop();
    process.exit(0);
  });
}

startServer().catch(console.error);
```

### Effect Server Entry Point

```typescript
// server/src/index.effect.ts
import { Effect, Layer, Schedule, Runtime, Scope } from "effect"

// The program is a description of what to run
const program = Effect.gen(function* () {
  const config = yield* Config
  const logger = yield* Logger

  yield* logger.info("Starting server", { env: config.env })

  // Start cron if enabled (returns Fiber)
  const cronFiber = config.enableCron
    ? yield* CronPipeline.start.pipe(Effect.fork)
    : yield* Effect.succeed(null)

  // Start HTTP server
  yield* HttpServer.serve(app).pipe(
    Effect.scoped  // Resources cleaned up on shutdown
  )

  // Graceful shutdown
  yield* Effect.addFinalizer(() =>
    Effect.all([
      cronFiber ? Fiber.interrupt(cronFiber) : Effect.void,
      Logger.info("Server shutting down")
    ])
  )
})

// Compose all layers
const MainLive = Layer.mergeAll(
  ConfigLive,
  PrismaLive,
  PgaClientLive,
  CommoditiesClientLive,
  LoggerLive,
  TracingLive
)

// Run the program
program.pipe(
  Effect.provide(MainLive),
  Runtime.runPromise
)
```

---

## Typed Errors

### Current Error Handling

```typescript
// Current: errors are stringly typed or any
export const errorHandler = (error: Error, c: Context) => {
  if (error.name === "ValidationError") {
    return c.json({ error: error.message }, 400);
  } else if (error.name === "UnauthorizedError") {
    return c.json({ error: "Unauthorized" }, 401);
  }
  // ...
}

// Service level: inconsistent error returns
async function createLineupForEvent(params) {
  // Sometimes returns { error: string }
  // Sometimes throws
  // Sometimes returns { error: "validation", messages: string[] }
}
```

### Effect Error Hierarchy

```typescript
// errors/domain.ts
import { Data } from "effect"

// Base error with cause tracking
export class AppError extends Data.TaggedError("AppError")<{
  message: string
  cause?: unknown
}> {}

// Domain-specific errors
export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  resource: "user" | "event" | "lineup" | "contest" | "participant"
  id: string
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  field?: string
  messages: string[]
}> {}

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  operation: string
  cause: unknown
}> {}

export class AuthError extends Data.TaggedError("AuthError")<{
  reason: "missing_token" | "invalid_token" | "expired" | "insufficient_permissions"
}> {}

// External API errors
export class PgaApiError extends Data.TaggedError("PgaApiError")<{
  endpoint: string
  statusCode?: number
  cause?: unknown
}> {}

export class RateLimitError extends Data.TaggedError("RateLimitError")<{
  retryAfterMs: number
}> {}

export class NetworkError extends Data.TaggedError("NetworkError")<{
  url: string
  cause: unknown
}> {}

// Contest domain errors
export class ContestError extends Data.TaggedError("ContestError")<{
  code: 
    | "not_editable"
    | "already_locked"
    | "event_mismatch"
    | "max_entries_reached"
    | "insufficient_funds"
  contestId: string
  details?: string
}> {}

// Lineup domain errors  
export class LineupError extends Data.TaggedError("LineupError")<{
  code:
    | "invalid_picks"
    | "duplicate_name"
    | "event_not_editable"
    | "roster_validation_failed"
  lineupId?: string
  messages: string[]
}> {}
```

### Using Typed Errors in Services

```typescript
// services/lineups/createLineupForEvent.ts
import { Effect } from "effect"

// The type signature tells callers EXACTLY what can go wrong
export const createLineupForEvent = (
  params: CreateLineupParams
): Effect.Effect<
  Lineup,
  | NotFoundError      // Event doesn't exist
  | ValidationError    // Invalid picks
  | LineupError        // Roster validation failed
  | ContestError       // Contest scope issues
  | DatabaseError,     // Prisma failure
  PrismaService | SportRegistry
> =>
  Effect.gen(function* () {
    const prisma = yield* PrismaService
    const registry = yield* SportRegistry

    // Fetch event - typed failure
    const event = yield* Effect.tryPromise({
      try: () => prisma.competitionEvent.findUnique({
        where: { id: params.eventId }
      }),
      catch: (e) => new DatabaseError({ operation: "findEvent", cause: e })
    }).pipe(
      Effect.flatMap(Option.fromNullable),
      Effect.mapError(() => new NotFoundError({
        resource: "event",
        id: params.eventId
      }))
    )

    // Check editability
    if (!eventIsEditable(event)) {
      return yield* Effect.fail(new LineupError({
        code: "event_not_editable",
        messages: ["This event has started or finished"]
      }))
    }

    // Validate roster via sport module
    const sportModule = yield* registry.require(event.sportId)
    const validation = yield* sportModule.validateRoster(
      event.id,
      params.picks,
      sportModule.rosterRules
    )

    if (!validation.valid) {
      return yield* Effect.fail(new LineupError({
        code: "roster_validation_failed",
        messages: validation.errors
      }))
    }

    // Create lineup
    const lineup = yield* Effect.tryPromise({
      try: () => prisma.lineup.create({
        data: {
          userId: params.userId,
          eventId: params.eventId,
          name: params.name ?? generateLineupName(),
          prediction: params.prediction,
          picks: {
            create: params.picks.map((epId, idx) => ({
              eventParticipantId: epId,
              slotIndex: idx
            }))
          }
        },
        include: { picks: true }
      }),
      catch: (e) => {
        // Detect duplicate name constraint
        if (isDuplicateKeyError(e)) {
          return new LineupError({
            code: "duplicate_name",
            messages: ["A lineup with this name already exists"]
          })
        }
        return new DatabaseError({ operation: "createLineup", cause: e })
      }
    })

    return lineup
  })
```

### Exhaustive Error Handling in Routes

```typescript
// routes/lineups.ts
const createLineupRoute = Effect.gen(function* () {
  const req = yield* HttpRequest
  const user = yield* AuthContext
  const body = yield* parseBody(lineupWriteBodySchema)

  const lineup = yield* createLineupForEvent({
    userId: user.id,
    eventId: req.param("eventId"),
    ...body
  })

  return HttpResponse.json({ lineup })
}).pipe(
  // Exhaustive error handling - compiler ensures all errors are handled
  Effect.catchTags({
    NotFoundError: (e) =>
      HttpResponse.json({ error: `${e.resource} not found` }, { status: 404 }),
    
    ValidationError: (e) =>
      HttpResponse.json({ error: "Validation failed", messages: e.messages }, { status: 400 }),
    
    LineupError: (e) => {
      const status = e.code === "event_not_editable" ? 403 : 400
      return HttpResponse.json({ error: e.code, messages: e.messages }, { status })
    },
    
    ContestError: (e) =>
      HttpResponse.json({ error: e.code, details: e.details }, { status: 400 }),
    
    DatabaseError: (e) => {
      yield* Logger.error("Database error", { operation: e.operation, cause: e.cause })
      return HttpResponse.json({ error: "Internal error" }, { status: 500 })
    }
  })
)
```

---

## Dependency Injection via Layers

### Service Definitions

```typescript
// services/prisma.ts
import { Context, Effect, Layer, Scope } from "effect"
import { PrismaClient } from "@prisma/client"

export class PrismaService extends Context.Tag("PrismaService")<
  PrismaService,
  PrismaClient
>() {}

// Layer with connection lifecycle
export const PrismaLive = Layer.scoped(
  PrismaService,
  Effect.acquireRelease(
    Effect.sync(() => {
      const client = new PrismaClient()
      return client
    }).pipe(
      Effect.tap((client) => Effect.promise(() => client.$connect()))
    ),
    (client) => Effect.promise(() => client.$disconnect())
  )
)

// services/pga-client.ts
export interface PgaApiClient {
  readonly getField: (tournamentId: string) => Effect.Effect<FieldResponse, PgaApiError>
  readonly getLeaderboard: () => Effect.Effect<RawLeaderboard, PgaApiError | RateLimitError>
  readonly getScorecard: (
    playerId: string,
    tournamentId: string
  ) => Effect.Effect<ScorecardData, PgaApiError>
  readonly getTournament: (tournamentId: string) => Effect.Effect<TournamentData, PgaApiError>
}

export class PgaClient extends Context.Tag("PgaClient")<
  PgaClient,
  PgaApiClient
>() {}

export const PgaClientLive = Layer.effect(
  PgaClient,
  Effect.gen(function* () {
    const config = yield* ConfigService
    const logger = yield* Logger

    return {
      getField: (tournamentId) =>
        Effect.gen(function* () {
          yield* logger.debug("Fetching PGA field", { tournamentId })
          
          const response = yield* httpFetch(
            "https://orchestrator.pgatour.com/graphql",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-API-Key": config.pgaApiKey
              },
              body: JSON.stringify({
                query: fieldQuery(tournamentId)
              })
            }
          ).pipe(
            Effect.mapError((e) => new PgaApiError({
              endpoint: "field",
              cause: e
            })),
            Effect.flatMap(parseJsonResponse),
            Effect.retry(
              Schedule.exponential("1 second").pipe(
                Schedule.intersect(Schedule.recurs(3)),
                Schedule.tapOutput((delay) =>
                  logger.warn("Retrying PGA API", { delay })
                )
              )
            )
          )

          return response.data.field
        }),

      getLeaderboard: () =>
        Effect.gen(function* () {
          // With caching built-in
          yield* Effect.cached(
            fetchLeaderboardImpl(),
            Duration.minutes(5)
          )
        }),

      getScorecard: (playerId, tournamentId) =>
        fetchScorecardImpl(playerId, tournamentId).pipe(
          Effect.timeout("15 seconds"),
          Effect.mapError((e) =>
            e._tag === "TimeoutException"
              ? new PgaApiError({ endpoint: "scorecard", cause: "timeout" })
              : e
          )
        ),

      getTournament: (tournamentId) =>
        fetchTournamentImpl(tournamentId)
    }
  })
)
```

### Composing Layers

```typescript
// layers/main.ts
import { Layer } from "effect"

// Independent layers can be merged
const CoreLive = Layer.mergeAll(
  ConfigLive,
  LoggerLive,
  TracingLive
)

// Layers with dependencies compose
const DatabaseLive = PrismaLive.pipe(
  Layer.provide(ConfigLive)
)

const ExternalApiLive = Layer.mergeAll(
  PgaClientLive,
  CommoditiesClientLive,
  OpenF1ClientLive
).pipe(
  Layer.provide(Layer.mergeAll(ConfigLive, LoggerLive))
)

// Sport modules depend on everything
const SportRegistryLive = SportRegistryLayer.pipe(
  Layer.provide(Layer.mergeAll(DatabaseLive, ExternalApiLive))
)

// Final composition
export const MainLive = Layer.mergeAll(
  CoreLive,
  DatabaseLive,
  ExternalApiLive,
  SportRegistryLive,
  HttpServerLive
)

// Testing: swap implementations
export const TestLive = Layer.mergeAll(
  ConfigTest,
  LoggerTest,
  PrismaTest,       // In-memory or mock
  PgaClientMock,    // Fixture responses
  SportRegistryLive
)
```

---

## Data Ingestion Pipelines (EDL)

This is where Effect really shines. The current cron scheduler has manual error handling, no structured concurrency, and implicit dependencies.

### Current Pipeline

```typescript
// Current: server/src/cron/scheduler.ts
private async runScorePipeline(): Promise<void> {
  if (this.scorePipelineRunning) {
    console.log("[CRON] Score Pipeline - Skipped: already running");
    return;
  }

  this.scorePipelineRunning = true;
  const pipelineErrors: string[] = [];

  try {
    const events = await getActiveEvents();

    for (const event of events) {
      await this.executeWithErrorHandling(
        `Sport pipeline (${event.sportId}/${event.id})`,
        () => runSportEventPipeline(event.id, event.sportId),
        pipelineErrors,
      );
    }

    await this.executeWithErrorHandling("Activate Contests", batchActivateContests, pipelineErrors);
    await this.executeWithErrorHandling("Settle Contests", batchSettleContests, pipelineErrors);
    // ...
  } catch (error) {
    // ...
  } finally {
    this.scorePipelineRunning = false;
  }
}
```

### Effect Pipeline

```typescript
// pipelines/score-pipeline.ts
import { Effect, Schedule, Fiber, Ref, Deferred } from "effect"

// Pipeline errors are typed
type PipelineError =
  | DatabaseError
  | PgaApiError
  | ContestActivationError
  | ContestSettlementError

// Pipeline context
interface PipelineRun {
  startedAt: Date
  errors: Array<{ stage: string; error: unknown }>
  eventsProcessed: number
}

export class ScorePipeline extends Context.Tag("ScorePipeline")<
  ScorePipeline,
  {
    readonly start: Effect.Effect<Fiber.Fiber<void, never>, never, Scope>
    readonly runOnce: Effect.Effect<PipelineRun, never, never>
    readonly isRunning: Effect.Effect<boolean>
  }
>() {}

export const ScorePipelineLive = Layer.effect(
  ScorePipeline,
  Effect.gen(function* () {
    const prisma = yield* PrismaService
    const sportRegistry = yield* SportRegistry
    const logger = yield* Logger
    const tracer = yield* Tracer

    // Semaphore prevents concurrent runs
    const runningRef = yield* Ref.make(false)

    const runOnce = Effect.gen(function* () {
      const run: PipelineRun = {
        startedAt: new Date(),
        errors: [],
        eventsProcessed: 0
      }

      yield* tracer.span("score-pipeline", {
        attributes: { startedAt: run.startedAt.toISOString() }
      })

      // 1. Fetch active events
      const events = yield* Effect.tryPromise({
        try: () => prisma.competitionEvent.findMany({
          where: { isActive: true },
          select: { id: true, sportId: true }
        }),
        catch: (e) => new DatabaseError({ operation: "getActiveEvents", cause: e })
      }).pipe(
        Effect.tapError((e) => logger.error("Failed to fetch active events", { error: e })),
        Effect.orElseSucceed(() => [])  // Continue with empty if DB fails
      )

      // 2. Process each event (with controlled concurrency)
      yield* Effect.forEach(
        events,
        (event) =>
          processEventPipeline(event).pipe(
            Effect.tap(() => Effect.sync(() => run.eventsProcessed++)),
            Effect.tapError((error) =>
              Effect.sync(() => run.errors.push({
                stage: `event:${event.id}`,
                error
              }))
            ),
            Effect.catchAll(() => Effect.void)  // Don't fail entire pipeline
          ),
        { concurrency: 3 }  // Process up to 3 events concurrently
      )

      // 3. Batch operations (sequential, order matters)
      yield* batchActivateContests().pipe(
        Effect.tapError((e) =>
          Effect.sync(() => run.errors.push({ stage: "activateContests", error: e }))
        ),
        Effect.catchAll(() => Effect.void)
      )

      yield* batchSettleContests().pipe(
        Effect.tapError((e) =>
          Effect.sync(() => run.errors.push({ stage: "settleContests", error: e }))
        ),
        Effect.catchAll(() => Effect.void)
      )

      yield* batchSyncReferralGraph().pipe(
        Effect.tapError((e) =>
          Effect.sync(() => run.errors.push({ stage: "syncReferralGraph", error: e }))
        ),
        Effect.catchAll(() => Effect.void)
      )

      // 4. Report to BetterStack
      if (run.errors.length > 0) {
        yield* reportHeartbeatFailure(run)
      } else {
        yield* reportHeartbeatSuccess()
      }

      return run
    }).pipe(
      // Only one run at a time
      Effect.withSpan("score-pipeline-run"),
      Effect.ensuring(Ref.set(runningRef, false)),
      Effect.whenEffect(
        Ref.getAndSet(runningRef, true).pipe(
          Effect.map((wasRunning) => !wasRunning)
        )
      ),
      Effect.someOrElseEffect(() =>
        logger.info("Pipeline skipped: already running").pipe(
          Effect.as(undefined as unknown as PipelineRun)
        )
      )
    )

    return {
      runOnce,
      isRunning: Ref.get(runningRef),
      start: Effect.gen(function* () {
        yield* logger.info("Starting score pipeline scheduler")

        // Run every 5 minutes
        const fiber = yield* runOnce.pipe(
          Effect.repeat(Schedule.fixed("5 minutes")),
          Effect.fork
        )

        return fiber
      })
    }
  })
)

// Individual event pipeline
const processEventPipeline = (
  event: { id: string; sportId: string }
): Effect.Effect<void, PgaApiError | DatabaseError, SportRegistry | Logger> =>
  Effect.gen(function* () {
    const registry = yield* SportRegistry
    const logger = yield* Logger

    const sportModule = yield* registry.require(event.sportId)

    yield* logger.debug("Processing event", { eventId: event.id, sportId: event.sportId })

    // Sequential sport operations (order matters)
    yield* sportModule.syncEventMetadata(event.id)
    yield* sportModule.syncParticipantField(event.id)

    if (sportModule.handleWithdrawals) {
      yield* sportModule.handleWithdrawals(event.id)
    }

    const shouldSync = yield* sportModule.shouldSyncLiveScores(event.id)
    if (shouldSync) {
      yield* sportModule.syncLiveScores(event.id)
      yield* updateContestLineupsForEvent(event.id, event.sportId)

      if (sportModule.afterLiveScoreSync) {
        yield* sportModule.afterLiveScoreSync(event.id)
      }
    }

    yield* logger.debug("Event pipeline complete", { eventId: event.id })
  }).pipe(
    Effect.withSpan("event-pipeline", {
      attributes: { eventId: event.id, sportId: event.sportId }
    })
  )
```

### PGA Golf Live Score Sync with Effect

```typescript
// sports/pga-golf/syncLiveScores.ts
import { Effect, Stream, Chunk } from "effect"

interface ScoreUpdate {
  eventParticipantId: string
  total: number
  scoreData: Record<string, unknown>
}

export const syncGolfLiveScores = (
  eventId: string
): Effect.Effect<
  { updated: number; skipped: number },
  PgaApiError | DatabaseError,
  PrismaService | PgaClient | Logger
> =>
  Effect.gen(function* () {
    const prisma = yield* PrismaService
    const pgaClient = yield* PgaClient
    const logger = yield* Logger

    // 1. Fetch event
    const event = yield* getGolfEvent(eventId)
    const pgaTourId = event.externalId

    // 2. Check if we should sync
    if (!golfShouldSyncLiveScores(event.metadata)) {
      yield* logger.info("Skipping live score sync - event not live", { eventId })
      return { updated: 0, skipped: 0 }
    }

    // 3. Fetch leaderboard (cached)
    const leaderboard = yield* pgaClient.getLeaderboard()
    const byPgaId = new Map(
      leaderboard.players
        .filter((row) => row.player?.id)
        .map((row) => [row.player!.id, row])
    )

    // 4. Fetch event participants
    const eventParticipants = yield* Effect.tryPromise({
      try: () => prisma.eventParticipant.findMany({
        where: { eventId },
        include: { participant: true }
      }),
      catch: (e) => new DatabaseError({ operation: "getEventParticipants", cause: e })
    })

    // 5. Stream-based concurrent scorecard fetching
    const pendingUpdates = yield* Stream.fromIterable(eventParticipants).pipe(
      // Chunk for batching
      Stream.grouped(15),
      // Process each chunk concurrently
      Stream.mapEffect((chunk) =>
        Effect.forEach(
          chunk,
          (ep) => fetchParticipantScoreUpdate(ep, byPgaId, pgaTourId, leaderboard),
          { concurrency: "unbounded" }
        )
      ),
      Stream.flattenChunks,
      // Filter out nulls
      Stream.filterMap(Option.fromNullable),
      Stream.runCollect
    )

    // 6. Apply round icons (pure transformation)
    const updates = Chunk.toReadonlyArray(pendingUpdates)
    applyGolfRoundIcons(updates, roundIconConfigFromEnv())

    // 7. Batch write updates (only changed scores)
    let updated = 0
    let skipped = 0

    yield* Effect.forEach(
      updates,
      (update) =>
        updateIfChanged(update).pipe(
          Effect.tap((wasUpdated) =>
            Effect.sync(() => {
              if (wasUpdated) updated++
              else skipped++
            })
          )
        ),
      { concurrency: 5 }  // Limit DB write concurrency
    )

    yield* logger.info("Live scores synced", {
      eventId,
      updated,
      skipped,
      total: updates.length
    })

    return { updated, skipped }
  }).pipe(
    Effect.withSpan("sync-golf-live-scores", {
      attributes: { eventId }
    })
  )

// Helper: fetch scorecard with timeout
const fetchParticipantScoreUpdate = (
  eventParticipant: EventParticipantWithParticipant,
  leaderboardByPgaId: Map<string, LeaderboardRow>,
  pgaTourId: string,
  leaderboard: RawLeaderboard
): Effect.Effect<ScoreUpdate | null, never, PgaClient> =>
  Effect.gen(function* () {
    const pgaClient = yield* PgaClient
    const playerPgaId = eventParticipant.participant.externalId

    if (!playerPgaId) return null

    const leaderboardRow = leaderboardByPgaId.get(playerPgaId)
    if (!leaderboardRow) return null

    // Fetch scorecard with timeout and error recovery
    const scorecard = yield* pgaClient.getScorecard(playerPgaId, pgaTourId).pipe(
      Effect.option  // Convert error to None
    )

    if (Option.isNone(scorecard)) return null

    const payload = transformGolfParticipantScores(
      leaderboardRow,
      scorecard.value,
      leaderboard.players,
      getCurrentPeriod(eventParticipant)
    )

    if (!payload) return null

    return {
      eventParticipantId: eventParticipant.id,
      total: payload.total,
      scoreData: buildScoreData(payload)
    }
  })

// Helper: fingerprint-based change detection
const updateIfChanged = (
  update: ScoreUpdate
): Effect.Effect<boolean, DatabaseError, PrismaService> =>
  Effect.gen(function* () {
    const prisma = yield* PrismaService

    const existing = yield* Effect.tryPromise({
      try: () => prisma.eventParticipant.findUnique({
        where: { id: update.eventParticipantId },
        select: { total: true, scoreData: true }
      }),
      catch: (e) => new DatabaseError({ operation: "getExistingScore", cause: e })
    })

    if (!existing) return false

    const existingFingerprint = scoreFingerprint(existing.total, existing.scoreData)
    const newFingerprint = scoreFingerprint(update.total, update.scoreData)

    if (existingFingerprint === newFingerprint) {
      return false
    }

    yield* Effect.tryPromise({
      try: () => prisma.eventParticipant.update({
        where: { id: update.eventParticipantId },
        data: {
          total: update.total,
          scoreData: update.scoreData as Prisma.InputJsonValue
        }
      }),
      catch: (e) => new DatabaseError({ operation: "updateScore", cause: e })
    })

    return true
  })
```

### Commodities Quote Sync with Effect

```typescript
// sports/commodities/syncQuotes.ts
import { Effect, Duration } from "effect"

export const syncCommoditiesQuotes = (
  eventId: string
): Effect.Effect<
  { updated: number; total: number },
  DatabaseError | MarketDataError,
  PrismaService | MarketDataClient | Logger
> =>
  Effect.gen(function* () {
    const prisma = yield* PrismaService
    const marketData = yield* MarketDataClient
    const logger = yield* Logger

    // 1. Get event field
    const event = yield* getCommoditiesEvent(eventId)
    const field = getEventFieldSnapshot(event.metadata)

    if (field.length === 0) {
      return { updated: 0, total: 0 }
    }

    // 2. Batch fetch all quotes (external API)
    const quotes = yield* marketData.fetchQuotesForField(field).pipe(
      Effect.retry(
        Schedule.exponential("2 seconds").pipe(
          Schedule.compose(Schedule.recurs(3))
        )
      ),
      Effect.tapError((e) =>
        logger.warn("Quote fetch failed, using cached", { error: e })
      ),
      Effect.orElse(() => marketData.getCachedQuotes(field))
    )

    // 3. Get participants
    const participants = yield* Effect.tryPromise({
      try: () => prisma.participant.findMany({
        where: { sportId: COMMODITIES_SPORT_ID },
        select: { id: true, externalId: true, metadata: true }
      }),
      catch: (e) => new DatabaseError({ operation: "getParticipants", cause: e })
    })

    const participantByExternalId = new Map(
      participants.map((row) => [row.externalId, row])
    )

    // 4. Update quotes
    let updated = 0
    for (const entry of field) {
      const quote = quotes.get(entry.ticker)
      if (!quote) continue

      const externalId = commodityExternalId(entry.ticker)
      const row = participantByExternalId.get(externalId)
      if (!row) continue

      yield* Effect.tryPromise({
        try: () => prisma.participant.update({
          where: { id: row.id },
          data: {
            metadata: {
              ...parseCommodityParticipantMetadata(row.metadata),
              quote: marketQuoteToSnapshot(quote)
            }
          }
        }),
        catch: (e) => new DatabaseError({ operation: "updateQuote", cause: e })
      })

      updated++
    }

    yield* logger.info("Commodity quotes synced", {
      eventId,
      updated,
      total: field.length
    })

    return { updated, total: field.length }
  }).pipe(
    Effect.withSpan("sync-commodities-quotes", {
      attributes: { eventId }
    })
  )
```

---

## Sport Plugin Architecture

### Current Sport Module Interface

```typescript
// packages/sport-sdk/src/sport-module.ts (current)
export interface SportModule {
  readonly id: string
  initEvent(externalId: string): Promise<void>
  syncEventMetadata(eventId: string): Promise<void>
  syncParticipantField(eventId: string): Promise<void>
  syncLiveScores(eventId: string): Promise<void>
  shouldSyncLiveScores(eventId: string): Promise<boolean>
  getEventStatus(eventId: string): Promise<EventStatus>
  getCandidatePool(eventId: string): Promise<Candidate[]>
  validateRoster(eventId: string, picks: string[], rules: RosterRules): Promise<ValidationResult>
  // ...
}
```

### Effect Sport Module Interface

```typescript
// packages/sport-sdk/src/sport-module.effect.ts
import { Effect, Context, Layer } from "effect"

// Sport-specific error types
export class SportSyncError extends Data.TaggedError("SportSyncError")<{
  sportId: string
  operation: "metadata" | "field" | "scores"
  cause: unknown
}> {}

export class SportValidationError extends Data.TaggedError("SportValidationError")<{
  sportId: string
  errors: string[]
}> {}

// Effect-based sport module interface
export interface SportModuleEffect {
  readonly id: string
  readonly name: string
  readonly rosterRules: RosterRules
  readonly scoringRules: ScoringRules
  readonly predictionRules: PredictionRules

  // Data sync operations
  readonly initEvent: (
    externalId: string
  ) => Effect.Effect<void, SportSyncError | DatabaseError, SportDeps>

  readonly syncEventMetadata: (
    eventId: string
  ) => Effect.Effect<void, SportSyncError | DatabaseError, SportDeps>

  readonly syncParticipantField: (
    eventId: string
  ) => Effect.Effect<void, SportSyncError | DatabaseError, SportDeps>

  readonly syncLiveScores: (
    eventId: string
  ) => Effect.Effect<{ updated: number }, SportSyncError | DatabaseError, SportDeps>

  readonly shouldSyncLiveScores: (
    eventId: string
  ) => Effect.Effect<boolean, DatabaseError, SportDeps>

  readonly getEventStatus: (
    eventId: string
  ) => Effect.Effect<EventStatus, NotFoundError, SportDeps>

  // Candidate/validation operations
  readonly getCandidatePool: (
    eventId: string
  ) => Effect.Effect<Candidate[], NotFoundError, SportDeps>

  readonly validateRoster: (
    eventId: string,
    picks: readonly string[]
  ) => Effect.Effect<ValidationResult, SportValidationError, SportDeps>

  // Pure functions (no Effect wrapper needed)
  readonly rankEntries: (entries: LineupEntryInput[]) => RankedEntry[]
  readonly shouldActivateContest: (eventStatus: EventStatus) => boolean
  readonly shouldSettleContest: (eventStatus: EventStatus) => boolean

  // Optional lifecycle hooks
  readonly handleWithdrawals?: (
    eventId: string
  ) => Effect.Effect<void, SportSyncError, SportDeps>

  readonly afterLiveScoreSync?: (
    eventId: string
  ) => Effect.Effect<void, never, SportDeps>
}

// Dependencies that sport modules need
type SportDeps = PrismaService | Logger

// Sport Registry service
export interface SportRegistry {
  readonly get: (sportId: string) => Option.Option<SportModuleEffect>
  readonly require: (sportId: string) => Effect.Effect<SportModuleEffect, NotFoundError>
  readonly list: () => readonly SportModuleEffect[]
}

export class SportRegistryService extends Context.Tag("SportRegistry")<
  SportRegistryService,
  SportRegistry
>() {}

// Registry implementation
export const SportRegistryLive = Layer.succeed(
  SportRegistryService,
  {
    modules: new Map<string, SportModuleEffect>([
      ["pga-golf", pgaGolfModule],
      ["f1", f1Module],
      ["commodities", commoditiesModule]
    ]),

    get(sportId) {
      return Option.fromNullable(this.modules.get(sportId))
    },

    require(sportId) {
      return Effect.fromOption(
        this.get(sportId),
        () => new NotFoundError({ resource: "sport", id: sportId })
      )
    },

    list() {
      return Array.from(this.modules.values())
    }
  }
)
```

### PGA Golf Module Implementation

```typescript
// packages/sport-pga-golf/src/module.effect.ts
import { Effect, Layer } from "effect"

export const createPgaGolfModule = (
  handlers: PgaGolfHandlers
): SportModuleEffect => ({
  id: PGA_GOLF_SPORT_ID,
  name: "PGA Golf",
  rosterRules: GOLF_ROSTER_RULES,
  scoringRules: GOLF_SCORING_RULES,
  predictionRules: GOLF_PREDICTION_RULES,

  initEvent: (externalId) =>
    Effect.gen(function* () {
      const prisma = yield* PrismaService
      const pgaClient = yield* PgaClient
      const logger = yield* Logger

      yield* logger.info("Initializing golf event", { pgaTourId: externalId })

      // Fetch tournament from PGA
      const tournament = yield* pgaClient.getTournament(externalId).pipe(
        Effect.mapError((e) => new SportSyncError({
          sportId: PGA_GOLF_SPORT_ID,
          operation: "metadata",
          cause: e
        }))
      )

      // Load summary sections from file
      const summarySections = yield* loadSummarySections(externalId).pipe(
        Effect.option
      )

      // Upsert event
      const event = yield* upsertGolfEvent(
        externalId,
        tournament,
        Option.getOrUndefined(summarySections)
      )

      // Sync metadata and field
      yield* handlers.syncMetadata(event.id, { seedBeautyImage: true })
      yield* handlers.syncField(event.id)

      // Mark as active (deactivate others)
      yield* Effect.tryPromise({
        try: async () => {
          await prisma.$transaction([
            prisma.competitionEvent.updateMany({
              where: { sportId: PGA_GOLF_SPORT_ID, isActive: true },
              data: { isActive: false }
            }),
            prisma.competitionEvent.update({
              where: { id: event.id },
              data: { isActive: true }
            })
          ])
        },
        catch: (e) => new DatabaseError({ operation: "activateEvent", cause: e })
      })

      yield* logger.info("Golf event initialized", {
        eventId: event.id,
        pgaTourId: externalId
      })
    }),

  syncEventMetadata: (eventId) =>
    handlers.syncMetadata(eventId, { seedBeautyImage: false }),

  syncParticipantField: handlers.syncField,

  syncLiveScores: handlers.syncLiveScores,

  shouldSyncLiveScores: (eventId) =>
    Effect.gen(function* () {
      const prisma = yield* PrismaService
      const event = yield* Effect.tryPromise({
        try: () => prisma.competitionEvent.findUnique({
          where: { id: eventId },
          select: { metadata: true }
        }),
        catch: (e) => new DatabaseError({ operation: "getEvent", cause: e })
      })

      return event ? golfShouldSyncLiveScores(event.metadata) : false
    }),

  getEventStatus: (eventId) =>
    Effect.gen(function* () {
      const prisma = yield* PrismaService
      const event = yield* Effect.tryPromise({
        try: () => prisma.competitionEvent.findUnique({
          where: { id: eventId },
          select: { metadata: true }
        }),
        catch: (e) => new DatabaseError({ operation: "getEvent", cause: e })
      }).pipe(
        Effect.flatMap(Option.fromNullable),
        Effect.mapError(() => new NotFoundError({ resource: "event", id: eventId }))
      )

      return deriveGolfEventStatus(event.metadata)
    }),

  getCandidatePool: (eventId) =>
    Effect.gen(function* () {
      const prisma = yield* PrismaService

      const participants = yield* Effect.tryPromise({
        try: () => prisma.eventParticipant.findMany({
          where: { eventId },
          include: { participant: true }
        }),
        catch: (e) => new DatabaseError({ operation: "getCandidates", cause: e })
      })

      return participants.map(transformToCandidate)
    }),

  validateRoster: (eventId, picks) =>
    Effect.gen(function* () {
      // Pure validation logic
      const errors: string[] = []

      if (picks.length !== GOLF_ROSTER_RULES.slotCount) {
        errors.push(`Must select exactly ${GOLF_ROSTER_RULES.slotCount} players`)
      }

      if (!GOLF_ROSTER_RULES.allowDuplicates && new Set(picks).size !== picks.length) {
        errors.push("Duplicate picks not allowed")
      }

      if (errors.length > 0) {
        return { valid: false, errors }
      }

      // DB validation: verify all picks exist
      const prisma = yield* PrismaService
      const existing = yield* Effect.tryPromise({
        try: () => prisma.eventParticipant.count({
          where: {
            eventId,
            id: { in: [...picks] }
          }
        }),
        catch: (e) => new DatabaseError({ operation: "validatePicks", cause: e })
      })

      if (existing !== picks.length) {
        return {
          valid: false,
          errors: ["One or more selected players are not in the event field"]
        }
      }

      return { valid: true, errors: [] }
    }),

  // Pure functions
  rankEntries: rankGolfEntries,
  shouldActivateContest: (status) => status === "LIVE",
  shouldSettleContest: (status) => status === "COMPLETE",

  handleWithdrawals: (eventId) =>
    handlers.handleWithdrawals(eventId),

  afterLiveScoreSync: (eventId) =>
    handlers.afterLiveScoreSync(eventId)
})
```

---

## API Layer

### Effect-Hono Integration

```typescript
// lib/hono-effect.ts
import { Effect, Runtime } from "effect"
import { Hono, Context as HonoContext } from "hono"

// Middleware that provides Effect context
export const effectMiddleware = (layers: Layer.Layer<R, E, never>) =>
  async (c: HonoContext, next: () => Promise<void>) => {
    const runtime = Runtime.make(layers)
    c.set("effectRuntime", runtime)
    await next()
  }

// Handler wrapper
export const effectHandler = <A, E, R>(
  effect: (c: HonoContext) => Effect.Effect<A, E, R>
) =>
  async (c: HonoContext) => {
    const runtime = c.get("effectRuntime") as Runtime.Runtime<R>
    
    const result = await effect(c).pipe(
      Effect.either,
      Runtime.runPromise(runtime)
    )

    if (Either.isLeft(result)) {
      return handleError(c, result.left)
    }

    return result.right
  }

// Type-safe route builder
export class EffectRouter<R> {
  private hono: Hono

  constructor(private runtime: Runtime.Runtime<R>) {
    this.hono = new Hono()
  }

  get<A, E>(
    path: string,
    handler: (c: HonoContext) => Effect.Effect<A, E, R>
  ): this {
    this.hono.get(path, async (c) => {
      const result = await handler(c).pipe(
        Effect.either,
        Runtime.runPromise(this.runtime)
      )

      if (Either.isLeft(result)) {
        return handleError(c, result.left)
      }

      return c.json(result.right)
    })
    return this
  }

  post<A, E>(
    path: string,
    handler: (c: HonoContext) => Effect.Effect<A, E, R>
  ): this {
    // Similar implementation
    return this
  }

  build(): Hono {
    return this.hono
  }
}
```

### Effect-Based Route Handlers

```typescript
// routes/lineups.effect.ts
import { Effect, Schema } from "effect"

const LineupWriteBody = Schema.Struct({
  picks: Schema.Array(Schema.String),
  name: Schema.optional(Schema.String),
  prediction: Schema.optional(Schema.Number),
  contestId: Schema.optional(Schema.String)
})

const createLineupRoute = (c: HonoContext) =>
  Effect.gen(function* () {
    // Get authenticated user (from middleware)
    const user = yield* AuthContext

    // Parse and validate body
    const body = yield* Effect.tryPromise({
      try: () => c.req.json(),
      catch: () => new ValidationError({ messages: ["Invalid JSON body"] })
    }).pipe(
      Effect.flatMap(Schema.decodeUnknown(LineupWriteBody)),
      Effect.mapError((e) => new ValidationError({
        messages: formatSchemaErrors(e)
      }))
    )

    // Get path param
    const eventId = c.req.param("eventId")

    // Call service
    const lineup = yield* createLineupForEvent({
      userId: user.id,
      eventId,
      picks: body.picks,
      name: body.name,
      prediction: body.prediction,
      contestId: body.contestId
    })

    return c.json({ lineup })
  }).pipe(
    // Add auth middleware
    Effect.provideService(
      AuthContext,
      requireAuth(c)
    ),
    // Error handling
    Effect.catchTags({
      ValidationError: (e) =>
        Effect.succeed(c.json({ error: "Validation failed", messages: e.messages }, 400)),
      NotFoundError: (e) =>
        Effect.succeed(c.json({ error: `${e.resource} not found` }, 404)),
      LineupError: (e) =>
        Effect.succeed(c.json({ error: e.code, messages: e.messages }, 400)),
      DatabaseError: (e) =>
        Effect.gen(function* () {
          yield* Logger.error("Database error", { operation: e.operation })
          return c.json({ error: "Internal error" }, 500)
        })
    })
  )

// Register routes
export const lineupsRouter = new EffectRouter(runtime)
  .get("/:eventId", getLineupsRoute)
  .post("/:eventId", createLineupRoute)
  .put("/:lineupId", updateLineupRoute)
  .post("/clone/:lineupId", cloneLineupRoute)
  .build()
```

---

## Observability & Tracing

Effect has built-in support for structured logging and OpenTelemetry-compatible tracing.

```typescript
// lib/observability.ts
import { Effect, Logger, LogLevel } from "effect"
import { NodeSdk } from "@effect/opentelemetry"

// Configure tracing
const TracingLive = NodeSdk.layer({
  serviceName: "playthecut-server",
  resourceAttributes: {
    environment: process.env.NODE_ENV ?? "development"
  }
})

// Structured logging
const LoggerLive = Logger.replace(
  Logger.defaultLogger,
  Logger.make(({ logLevel, message, annotations, date, fiberId }) => {
    const structured = {
      timestamp: date.toISOString(),
      level: logLevel._tag,
      message,
      fiberId: fiberId.id,
      ...annotations
    }

    if (logLevel._tag === "Error" || logLevel._tag === "Fatal") {
      console.error(JSON.stringify(structured))
    } else {
      console.log(JSON.stringify(structured))
    }
  })
)

// Usage in effects
const syncWithTracing = (eventId: string) =>
  Effect.gen(function* () {
    yield* Effect.log("Starting sync", { eventId })

    const result = yield* syncGolfLiveScores(eventId).pipe(
      Effect.withSpan("sync-golf-live-scores", {
        attributes: { eventId }
      })
    )

    yield* Effect.log("Sync complete", {
      eventId,
      updated: result.updated,
      skipped: result.skipped
    })

    return result
  }).pipe(
    Effect.annotateLogs("sportId", "pga-golf")
  )
```

---

## Testing

Effect makes testing straightforward by allowing layer substitution.

```typescript
// test/services/lineups.test.ts
import { Effect, Layer, TestContext } from "effect"
import { describe, it, expect } from "vitest"

// Mock layers
const PrismaMock = Layer.succeed(
  PrismaService,
  {
    competitionEvent: {
      findUnique: Effect.succeed({
        id: "event-1",
        sportId: "pga-golf",
        metadata: { status: "SCHEDULED" }
      })
    },
    lineup: {
      create: Effect.succeed({
        id: "lineup-1",
        name: "My Lineup",
        picks: []
      })
    }
  } as unknown as PrismaClient
)

const SportRegistryMock = Layer.succeed(
  SportRegistryService,
  {
    require: (sportId) =>
      sportId === "pga-golf"
        ? Effect.succeed(mockPgaGolfModule)
        : Effect.fail(new NotFoundError({ resource: "sport", id: sportId })),
    get: () => Option.none(),
    list: () => []
  }
)

const TestLive = Layer.mergeAll(
  PrismaMock,
  SportRegistryMock,
  TestContext.TestContext
)

describe("createLineupForEvent", () => {
  it("creates a lineup successfully", async () => {
    const result = await createLineupForEvent({
      userId: "user-1",
      eventId: "event-1",
      picks: ["ep-1", "ep-2", "ep-3", "ep-4"]
    }).pipe(
      Effect.provide(TestLive),
      Effect.runPromise
    )

    expect(result.id).toBe("lineup-1")
  })

  it("fails for non-existent event", async () => {
    const PrismaNotFoundMock = Layer.succeed(
      PrismaService,
      {
        competitionEvent: {
          findUnique: Effect.succeed(null)
        }
      } as unknown as PrismaClient
    )

    const result = await createLineupForEvent({
      userId: "user-1",
      eventId: "missing-event",
      picks: []
    }).pipe(
      Effect.provide(Layer.mergeAll(PrismaNotFoundMock, SportRegistryMock)),
      Effect.either,
      Effect.runPromise
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("NotFoundError")
    }
  })

  it("validates roster rules", async () => {
    const result = await createLineupForEvent({
      userId: "user-1",
      eventId: "event-1",
      picks: ["ep-1", "ep-2"]  // Only 2 picks, need 4
    }).pipe(
      Effect.provide(TestLive),
      Effect.either,
      Effect.runPromise
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("LineupError")
      expect((result.left as LineupError).code).toBe("roster_validation_failed")
    }
  })
})
```

---

## Migration Strategy

### Incremental Adoption Path

1. **Phase 1: Error Types** (Low risk)
   - Define typed error hierarchy
   - Keep existing code, just add type annotations
   - Gradually convert `try/catch` to `Effect.tryPromise`

2. **Phase 2: Service Layers** (Medium risk)
   - Wrap Prisma in a service
   - Wrap external API clients
   - Test with mock layers

3. **Phase 3: Data Ingestion** (Medium-high impact)
   - Convert cron pipeline to Effect
   - Convert sport module sync functions
   - Add structured tracing

4. **Phase 4: API Layer** (Higher risk)
   - Effect-Hono integration
   - Route handlers as Effects
   - Middleware conversion

### Coexistence Pattern

```typescript
// During migration: Effect functions can call Promise functions
const legacyService = async (id: string): Promise<Data> => {
  // existing code
}

const newEffect = (id: string) =>
  Effect.tryPromise({
    try: () => legacyService(id),
    catch: (e) => new LegacyError({ cause: e })
  })

// And Promise functions can run Effects
const promiseWrapper = async (id: string): Promise<Data> => {
  return Effect.runPromise(
    newEffect(id).pipe(Effect.provide(MainLive))
  )
}
```

---

## Summary

Effect would bring several key improvements to the Play The Cut server:

| Area | Current | With Effect |
|------|---------|-------------|
| **Errors** | Strings, `any`, runtime surprises | Typed, exhaustive, compiler-enforced |
| **Dependencies** | Implicit globals, manual passing | Layers, testable, composable |
| **Concurrency** | Manual Promise.all, no backpressure | Fibers, controlled parallelism |
| **Retries** | Ad-hoc setTimeout loops | Declarative Schedule policies |
| **Resources** | Manual cleanup, sometimes forgotten | acquireRelease guarantees |
| **Logging** | console.log scattered | Structured, contextual, traceable |
| **Testing** | Mock everything manually | Swap layers, deterministic |

The data ingestion pipeline would benefit most dramatically - the EDL operations currently have:
- Implicit error handling (catch-all or ignore)
- No structured concurrency limits
- Manual caching
- Ad-hoc retry logic

With Effect, these become declarative, composable, and type-safe.

**Recommendation**: Start with the cron pipeline and sport module sync functions. These are:
1. Self-contained (not user-facing API)
2. Complex enough to benefit from Effect
3. A good proving ground before touching the API layer
