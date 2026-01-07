# Client Data Flow

## Data Flow Overview

The client receives data from two main sources:
1. **Server API**: Tournament data, contests, lineups, user data
2. **Blockchain**: Contract state, token balances, transactions

## Server Data Flow

### Tournament Data Flow

```mermaid
sequenceDiagram
    participant App
    participant Hook
    participant ReactQuery
    participant ApiClient
    participant Server
    
    App->>Hook: useTournamentData()
    Hook->>ReactQuery: useQuery('tournament')
    ReactQuery->>ApiClient: GET /api/tournaments/active
    ApiClient->>Server: HTTP Request
    Server-->>ApiClient: Tournament Data
    ApiClient-->>ReactQuery: JSON Response
    ReactQuery->>ReactQuery: Cache Data
    ReactQuery-->>Hook: Cached Data
    Hook-->>App: Tournament State
```

### Contest Data Flow

```mermaid
sequenceDiagram
    participant Component
    participant Hook
    participant ReactQuery
    participant ApiClient
    participant Server
    
    Component->>Hook: useContestQuery(contestId)
    Hook->>ReactQuery: useQuery(['contest', contestId])
    ReactQuery->>ApiClient: GET /api/contests/:id
    ApiClient->>Server: HTTP Request
    Server-->>ApiClient: Contest Data
    ApiClient-->>ReactQuery: JSON Response
    ReactQuery-->>Hook: Cached Data
    Hook-->>Component: Contest State
```

### Lineup Creation Flow

```mermaid
sequenceDiagram
    participant Component
    participant Hook
    participant ReactQuery
    participant ApiClient
    participant Server
    
    Component->>Hook: useLineupMutations()
    Hook->>ReactQuery: useMutation(createLineup)
    Component->>Hook: createLineup(data)
    Hook->>ApiClient: POST /api/lineup/:tournamentId
    ApiClient->>Server: HTTP Request
    Server-->>ApiClient: Created Lineup
    ApiClient-->>ReactQuery: Success
    ReactQuery->>ReactQuery: Invalidate Queries
    ReactQuery-->>Hook: Success
    Hook-->>Component: Updated State
```

## Blockchain Data Flow

### Token Balance Flow

```mermaid
sequenceDiagram
    participant Component
    participant Context
    participant Wagmi
    participant Blockchain
    
    Component->>Context: usePortoAuth()
    Context->>Wagmi: useBalance(token)
    Wagmi->>Blockchain: RPC Call
    Blockchain-->>Wagmi: Balance
    Wagmi-->>Context: Balance Data
    Context-->>Component: Token Balance
    Note over Wagmi,Blockchain: Polls every 30 seconds
```

### Contract Read Flow

```mermaid
sequenceDiagram
    participant Component
    participant Hook
    participant Wagmi
    participant Blockchain
    
    Component->>Hook: useReadContract()
    Hook->>Wagmi: useReadContract(config)
    Wagmi->>Blockchain: RPC Call
    Blockchain-->>Wagmi: Contract State
    Wagmi-->>Hook: Decoded Data
    Hook-->>Component: Contract Data
```

### Transaction Flow

```mermaid
sequenceDiagram
    participant Component
    participant Hook
    participant Wagmi
    participant Wallet
    participant Blockchain
    
    Component->>Hook: execute(calls)
    Hook->>Wagmi: useSendCalls(calls)
    Wagmi->>Wallet: Request Signature
    Wallet-->>Wagmi: Signed Transaction
    Wagmi->>Blockchain: Send Transaction
    Blockchain-->>Wagmi: Transaction Hash
    Wagmi-->>Hook: Pending State
    Hook->>Wagmi: useWaitForCallsStatus(hash)
    Wagmi->>Blockchain: Poll Status
    Blockchain-->>Wagmi: Confirmed
    Wagmi-->>Hook: Success State
    Hook-->>Component: Transaction Complete
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Component
    participant Context
    participant ApiClient
    participant Server
    participant Porto
    
    User->>Component: Connect Wallet
    Component->>Context: SIWE Flow
    Context->>ApiClient: POST /api/auth/siwe/nonce
    ApiClient->>Server: Request Nonce
    Server-->>ApiClient: Nonce
    ApiClient-->>Context: Nonce
    Context->>Porto: Sign Message
    Porto-->>Context: Signature
    Context->>ApiClient: POST /api/auth/siwe/verify
    ApiClient->>Server: Verify Signature
    Server->>Porto: Verify Signature
    Porto-->>Server: Valid
    Server-->>ApiClient: JWT Token
    ApiClient-->>Context: User + Token
    Context->>Context: Set User State
    Context-->>Component: Authenticated
```

## Data Transformation

### Server Data → Component Props
1. **API Response**: Raw JSON from server
2. **React Query**: Cached and typed
3. **Custom Hook**: Transformed to component format
4. **Component**: Rendered in UI

### Blockchain Data → Component Props
1. **RPC Response**: Raw blockchain data
2. **Wagmi**: Decoded and typed
3. **Custom Hook**: Transformed to component format
4. **Component**: Rendered in UI

## Data Synchronization

### Server Data Sync
- **Automatic**: React Query refetches on focus/reconnect
- **Manual**: Invalidate queries after mutations
- **Polling**: Token balances polled every 30 seconds

### Blockchain Data Sync
- **Automatic**: Wagmi refetches on block updates
- **Polling**: Balances polled every 30 seconds
- **Events**: Contract events (if implemented)

## Cache Management

### React Query Cache
- **Key Structure**: `['resource', id]` or `['resource', params]`
- **Invalidation**: After mutations
- **Prefetching**: Tournament data on app load

### Wagmi Cache
- **Automatic**: Wagmi manages cache
- **Block-based**: Updates on new blocks
- **Configurable**: Can adjust cache settings

## Error Handling Flow

```mermaid
graph TD
    A[Request] --> B{Success?}
    B -->|Yes| C[Update State]
    B -->|No| D{Error Type?}
    D -->|Network| E[Retry/Show Error]
    D -->|Validation| F[Show Validation Error]
    D -->|Server| G[Show Server Error]
    D -->|Blockchain| H[Show Transaction Error]
    E --> I[Global Error Context]
    F --> I
    G --> I
    H --> I
```

## Data Flow Patterns

### Read Pattern
1. Component requests data via hook
2. Hook checks cache
3. If cached and fresh, return cached data
4. If stale or missing, fetch from source
5. Update cache and return data

### Write Pattern
1. Component triggers mutation
2. Hook sends request to source
3. Source processes request
4. On success, invalidate related queries
5. Update UI with new data

### Optimistic Update Pattern
1. Component triggers mutation
2. Hook updates cache optimistically
3. Send request to source
4. On success, confirm update
5. On error, rollback and show error

## Performance Optimizations

### Prefetching
- Tournament data prefetched on app load
- Reduces initial load time
- Improves perceived performance

### Caching
- React Query caches server data
- Wagmi caches blockchain data
- Reduces redundant requests

### Polling Strategy
- Token balances: 30 seconds
- Tournament data: On focus/reconnect
- Contest data: On focus/reconnect

## Data Dependencies

### Tournament → Contests
- Contests depend on tournament data
- Invalidate contests when tournament updates

### Contest → Lineups
- Lineups depend on contest data
- Invalidate lineups when contest updates

### User → Everything
- Most data depends on user authentication
- Clear cache on logout

