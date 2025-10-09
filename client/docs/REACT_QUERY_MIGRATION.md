# React Query Migration - Tournament & Player Data

## Overview

Successfully migrated tournament and player data fetching from manual state management to TanStack Query (React Query). This is the first phase of a broader migration strategy.

## What Changed

### ✅ Files Created

1. **`/client/src/utils/queryKeys.ts`**

   - Centralized query key management
   - Type-safe query keys for tournaments, contests, lineups, players, and scores
   - Prevents key mismatches and typos

2. **`/client/src/hooks/useTournamentData.ts`**
   - Custom React Query hook for tournament data
   - Provides `useTournamentData()`, `useCurrentTournament()`, `useTournamentPlayers()`, and `useTournamentContests()`
   - Configured with 10-minute refetch interval for live score updates
   - Automatic background refetching on window focus

### ✅ Files Modified

3. **`/client/src/contexts/TournamentContext.tsx`**

   - Reduced from 86 lines to 49 lines (43% reduction!)
   - Removed manual state management (`useState`, `useEffect`)
   - Removed race condition checks (`isMounted`)
   - Now uses React Query hook internally
   - Maintains same API for backward compatibility

4. **`/client/src/App.tsx`**
   - Added comprehensive QueryClient configuration
   - Configured defaults: staleTime, gcTime, retry logic, refetch behavior
   - Added React Query DevTools for development

### ✅ Dependencies Updated

- `@tanstack/react-query`: `5.85.0` → `5.90.2`
- `@tanstack/react-query-devtools`: Newly added (dev dependency)

## Benefits Realized

### 1. **Automatic Caching & Deduplication**

Before: If 3 components needed tournament data, 3 API calls were made
After: Single API call, data shared across all components

### 2. **Built-in Loading & Error States**

Before:

```typescript
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<Error | null>(null);
```

After: Handled automatically by React Query

### 3. **Background Refetching**

- Data automatically refetches every 10 minutes (perfect for live golf scores)
- Refetches when user returns to tab
- Refetches when internet reconnects

### 4. **No More Race Conditions**

Before:

```typescript
let isMounted = true;
// ... complex cleanup logic
return () => {
  isMounted = false;
};
```

After: React Query handles this automatically

### 5. **Better Developer Experience**

- React Query DevTools shows all queries and their state
- Can inspect cache, trigger refetches, and debug easily
- Access via floating icon in development mode

## Configuration Details

### Query Keys Strategy

```typescript
queryKeys.tournaments.active();
// → ['tournaments', 'active']
```

This hierarchical structure allows:

- Invalidating all tournament queries: `invalidateQueries({ queryKey: ['tournaments'] })`
- Invalidating specific query: `invalidateQueries({ queryKey: queryKeys.tournaments.active() })`

### Refetch Strategy

- **staleTime**: 2 minutes - Data considered fresh
- **refetchInterval**: 10 minutes - Automatic background updates
- **gcTime**: 10 minutes - Cache retention time
- **refetchOnWindowFocus**: true - Update when user returns
- **refetchOnReconnect**: true - Update when internet reconnects

## Testing Results

✅ TypeScript compilation: **SUCCESS**  
✅ Production build: **SUCCESS**  
✅ Bundle size: Acceptable (1.3 MB main chunk)  
⚠️ Fast refresh warning: Non-blocking (common pattern)

## Next Steps (Future Migrations)

### Phase 2: Contest Data

- [ ] Create `useContestQuery` hook
- [ ] Create `useContestMutations` (join/leave)
- [ ] Update `ContestLobbyPage` to use queries

### Phase 3: Lineup Data

- [ ] Create `useLineupQueries` hooks
- [ ] Create `useLineupMutations` (create/update)
- [ ] Migrate `LineupContext` to React Query

### Phase 4: Mutations & Optimistic Updates

- [ ] Implement optimistic updates for joining contests
- [ ] Implement optimistic updates for creating lineups
- [ ] Add mutation error handling with rollback

### Phase 5: Advanced Features

- [ ] Implement prefetching for better UX
- [ ] Add pagination for large data sets
- [ ] Implement infinite queries where needed
- [ ] Fine-tune cache invalidation strategies

## How to Use

### In Components

```typescript
import { useTournamentData } from "../hooks/useTournamentData";

function MyComponent() {
  const { data, isLoading, error } = useTournamentData();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return <div>{data.tournament.name}</div>;
}
```

### Via Context (Backward Compatible)

```typescript
import { useTournament } from "../contexts/TournamentContext";

function MyComponent() {
  const { currentTournament, players, contests, isLoading, error } = useTournament();
  // Works exactly as before!
}
```

## React Query DevTools

**Access in development:**

1. Run the dev server: `pnpm run dev`
2. Look for the React Query DevTools icon (bottom left)
3. Click to open and inspect:
   - All active queries
   - Query state (fetching, stale, fresh)
   - Cached data
   - Query keys
   - Refetch manually

## Migration Impact Summary

| Metric                  | Before | After     | Change |
| ----------------------- | ------ | --------- | ------ |
| TournamentContext LOC   | 86     | 49        | -43%   |
| Manual state management | Yes    | No        | ✅     |
| Race condition handling | Manual | Automatic | ✅     |
| Background updates      | No     | Yes       | ✅     |
| Caching                 | No     | Yes       | ✅     |
| DevTools                | No     | Yes       | ✅     |
| API call deduplication  | No     | Yes       | ✅     |

## Recommendations

1. **Monitor in DevTools** - Watch query behavior in development
2. **Adjust staleTime** - Tune based on data freshness needs
3. **Continue Migration** - Move contests and lineups next
4. **Consider Prefetching** - Prefetch contest data when viewing tournament
5. **Add Error Boundaries** - Wrap components with error boundaries for better UX

## Resources

- [TanStack Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [Query Keys Guide](https://tanstack.com/query/latest/docs/react/guides/query-keys)
- [Caching Examples](https://tanstack.com/query/latest/docs/react/guides/caching)
- [DevTools Guide](https://tanstack.com/query/latest/docs/react/devtools)

---

**Migration Date:** October 9, 2025  
**Status:** ✅ Complete - Phase 1 (Read-only Tournament/Player Data)  
**Next Phase:** Contest Queries & Mutations
