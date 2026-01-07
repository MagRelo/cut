# Client Architecture

## High-Level Architecture

```mermaid
graph TB
    subgraph providers[Providers]
        WAGMI[WagmiProvider]
        QUERY[QueryClientProvider]
        ERROR[GlobalErrorProvider]
        AUTH[PortoAuthProvider]
        ROUTER[BrowserRouter]
    end
    
    subgraph app[App Component]
        ROUTES[Routes]
        PAGES[Pages]
    end
    
    subgraph components[Components]
        COMMON[Common Components]
        CONTEST[Contest Components]
        LINEUP[Lineup Components]
        USER[User Components]
    end
    
    subgraph hooks[Hooks]
        DATA[Data Hooks]
        MUTATION[Mutation Hooks]
        BLOCKCHAIN[Blockchain Hooks]
    end
    
    subgraph external[External Services]
        API[Server API]
        BLOCKCHAIN[Base Blockchain]
    end
    
    WAGMI --> ROUTER
    QUERY --> ROUTER
    ERROR --> ROUTER
    AUTH --> ROUTER
    ROUTER --> ROUTES
    ROUTES --> PAGES
    PAGES --> COMPONENTS
    COMPONENTS --> HOOKS
    HOOKS --> API
    HOOKS --> BLOCKCHAIN
```

## Component Hierarchy

```mermaid
graph TD
    App[App] --> Router[BrowserRouter]
    Router --> Providers[Provider Stack]
    Providers --> Routes[Routes]
    Routes --> Home[Home Page]
    Routes --> ContestList[Contest List]
    Routes --> ContestLobby[Contest Lobby]
    Routes --> LineupCreate[Lineup Create]
    Routes --> Account[Account]
    
    ContestLobby --> LineupManagement[LineupManagement]
    ContestLobby --> ContestResults[ContestResults]
    LineupManagement --> PlayerSelection[PlayerSelection]
    LineupManagement --> BlockchainHooks[Blockchain Hooks]
    
    Account --> TokenOperations[Token Operations]
    TokenOperations --> BlockchainHooks
```

## Provider Stack

```mermaid
graph LR
    A[WagmiProvider] --> B[QueryClientProvider]
    B --> C[GlobalErrorProvider]
    C --> D[PortoAuthProvider]
    D --> E[BrowserRouter]
    E --> F[App Content]
```

## Data Flow Patterns

### Server Data Flow

```mermaid
sequenceDiagram
    participant Component
    participant Hook
    participant ReactQuery
    participant ApiClient
    participant Server
    
    Component->>Hook: useQuery/useMutation
    Hook->>ReactQuery: Query/Mutation
    ReactQuery->>ApiClient: HTTP Request
    ApiClient->>Server: API Call
    Server-->>ApiClient: Response
    ApiClient-->>ReactQuery: Data
    ReactQuery-->>Hook: Cached Data
    Hook-->>Component: State
```

### Blockchain Data Flow

```mermaid
sequenceDiagram
    participant Component
    participant Hook
    participant Wagmi
    participant Blockchain
    
    Component->>Hook: useBlockchainTransaction
    Hook->>Wagmi: useSendCalls
    Wagmi->>Blockchain: Transaction
    Blockchain-->>Wagmi: Transaction Hash
    Wagmi-->>Hook: Status
    Hook-->>Component: Loading/Success/Error
```

## Key Architectural Patterns

### Provider Pattern
- **WagmiProvider**: Blockchain wallet and contract access
- **QueryClientProvider**: React Query for server state
- **GlobalErrorProvider**: Centralized error handling
- **PortoAuthProvider**: Authentication state
- **BrowserRouter**: Client-side routing

### Custom Hooks Pattern
- Encapsulate data fetching logic
- Reusable across components
- Type-safe with TypeScript
- Handle loading/error states

### Component Composition
- Small, focused components
- Composition over inheritance
- Props for configuration
- Context for shared state

### Separation of Concerns
- **Pages**: Route-level components
- **Components**: Reusable UI
- **Hooks**: Data and logic
- **Utils**: Pure functions
- **Contexts**: App-wide state

## State Management Architecture

### Server State (React Query)
- **Queries**: Read operations (GET)
- **Mutations**: Write operations (POST, PUT, DELETE)
- **Caching**: Automatic caching and invalidation
- **Refetching**: Automatic refetch on focus/reconnect

### Client State (Context API)
- **PortoAuthContext**: User authentication state
- **GlobalErrorContext**: Error messages and handling
- **Component State**: Local component state (useState)

### Blockchain State (Wagmi)
- **Account State**: Connected wallet, chain ID
- **Contract Reads**: Contract state queries
- **Transaction State**: Pending, confirmed, failed

## Key Design Decisions

### Why React Query?
- **Automatic Caching**: Reduces API calls
- **Background Updates**: Keeps data fresh
- **Optimistic Updates**: Better UX
- **Error Handling**: Built-in retry logic
- **DevTools**: Great debugging experience

### Why Wagmi?
- **Type Safety**: Full TypeScript support
- **Hooks-Based**: React-friendly API
- **Multi-Chain**: Easy chain switching
- **Transaction Management**: Built-in transaction handling

### Why Context API?
- **Simple**: No external dependencies
- **Built-in**: Part of React
- **App-Level State**: Perfect for auth and errors
- **Performance**: Fine for low-frequency updates

### Why Component Organization?
- **Pages**: Clear route boundaries
- **Components**: Reusable UI pieces
- **Hooks**: Reusable logic
- **Separation**: Easy to find and maintain

## Performance Considerations

### Code Splitting
- Route-based code splitting (React Router)
- Lazy loading for heavy components
- Dynamic imports where appropriate

### Caching Strategy
- React Query: 1 minute stale time, 5 minute cache
- Token balances: 30 second polling
- Tournament data: Prefetched on app load

### Optimization
- React.memo for expensive components
- useMemo for computed values
- useCallback for stable function references
- Virtualization for long lists (if needed)

## Security Considerations

### Authentication
- SIWE (Sign-In With Ethereum) for wallet auth
- JWT tokens in HTTP-only cookies
- Automatic token refresh

### Input Validation
- Yup/Zod schemas for form validation
- Server-side validation (never trust client)
- Sanitization of user input

### XSS Prevention
- React's built-in XSS protection
- No dangerous HTML rendering
- Sanitize any user-generated content

## Scalability Considerations

### Current Architecture
- Single-page application
- Client-side routing
- API-based backend communication

### Future Considerations
- **Code Splitting**: Already implemented
- **Lazy Loading**: Can add more
- **Service Workers**: For offline support
- **CDN**: Static assets can be CDN-hosted
- **Micro-Frontends**: Could split into modules if needed

