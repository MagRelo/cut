# Client Layer Overview

## Purpose

The client layer provides the user interface for Bet the Cut:
- **React Application**: Modern React 19 with TypeScript
- **Blockchain Integration**: Wagmi for wallet connections and contract interactions
- **State Management**: React Query for server state, Context API for app state
- **Routing**: React Router for client-side routing
- **UI Components**: Tailwind CSS for styling, Headless UI for accessible components

## Key Components

### Pages (`client/src/pages/`)
- **Home.tsx**: Landing page
- **ContestListPage.tsx**: List of contests
- **ContestLobbyPage.tsx**: Contest detail and management
- **ContestCreatePage.tsx**: Create new contest
- **LineupListPage.tsx**: User's lineups
- **LineupCreatePage.tsx**: Create/edit lineup
- **LeaderboardPage.tsx**: Tournament leaderboard
- **Account.tsx**: User account page
- **UserHistoryPage.tsx**: User's contest history
- **UserGroupListPage.tsx**: User groups list
- **UserGroupDetailPage.tsx**: User group detail
- **UserGroupCreatePage.tsx**: Create user group
- **ConnectPage.tsx**: Wallet connection page
- **AdminPage.tsx**: Admin panel
- **DebugPage.tsx**: Debug utilities

### Components (`client/src/components/`)
- **common/**: Shared components (Navigation, Footer, Modals, etc.)
- **contest/**: Contest-related components
- **lineup/**: Lineup management components
- **player/**: Player display components
- **tournament/**: Tournament display components
- **user/**: User account components
- **userGroup/**: User group components

### Hooks (`client/src/hooks/`)
- **useTournamentData.ts**: Tournament data fetching
- **useContestQuery.ts**: Contest data fetching
- **useLineupData.ts**: Lineup data operations
- **useContestMutations.ts**: Contest mutations
- **useBlockchainTransaction.ts**: Blockchain transaction handling
- **useContestantOperations.ts**: Contest join/leave operations
- **useTokenOperations.ts**: Token buy/sell operations
- **useContestPredictionData.ts**: Prediction market data

### Contexts (`client/src/contexts/`)
- **PortoAuthContext.tsx**: Authentication and user state
- **GlobalErrorContext.tsx**: Global error handling

### Utilities (`client/src/utils/`)
- **apiClient.ts**: HTTP client for API calls
- **blockchainUtils.tsx**: Blockchain utility functions
- **queryKeys.ts**: React Query key factories
- **contracts/**: Contract ABIs and addresses

## Dependencies

### Core Libraries
- **React 19**: UI framework
- **React Router 7**: Client-side routing
- **TypeScript**: Type safety

### State Management
- **@tanstack/react-query**: Server state management
- **React Context API**: App-level state (auth, errors)

### Blockchain
- **wagmi**: Ethereum wallet integration
- **viem**: Ethereum utilities
- **Porto**: Wallet infrastructure

### UI Libraries
- **Tailwind CSS**: Styling
- **@headlessui/react**: Accessible components
- **@heroicons/react**: Icons
- **@mui/material**: Material UI components (some usage)
- **chart.js**: Charts for leaderboards

### Form Handling
- **react-hook-form**: Form management
- **yup**: Schema validation
- **zod**: Type validation

## Interfaces

### With Server
- **REST API**: HTTP requests via `apiClient`
- **Authentication**: SIWE with JWT cookies
- **CORS**: Configured for server origin

### With Blockchain
- **Wagmi**: Wallet connections and contract reads
- **Viem**: Contract writes and transaction handling
- **Porto**: Signature verification and wallet management

## Key Concepts

### State Management Strategy
- **Server State**: React Query for API data
- **Client State**: React Context for auth, errors
- **Form State**: React Hook Form for forms
- **Blockchain State**: Wagmi hooks for contract data

### Data Fetching
- **React Query**: Caching, refetching, mutations
- **Prefetching**: Tournament data prefetched on app load
- **Polling**: Token balances polled every 30 seconds
- **Optimistic Updates**: Some mutations use optimistic updates

### Component Organization
- **Pages**: Top-level route components
- **Components**: Reusable UI components
- **Hooks**: Custom hooks for data and logic
- **Contexts**: App-wide state providers

## Quick Links

- [Client Architecture](architecture.md)
- [Component Structure](component-structure.md)
- [State Management](state-management.md)
- [Client Data Flow](data-flow.md)

