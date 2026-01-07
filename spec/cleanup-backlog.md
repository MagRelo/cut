# Cleanup Backlog

## Overview

This backlog contains prioritized cleanup tasks identified during the codebase analysis. Tasks are categorized by type and include effort estimates.

## Priority Levels

- **P0**: Critical - Must fix before production
- **P1**: High - Should fix soon
- **P2**: Medium - Fix when convenient
- **P3**: Low - Nice to have

## Effort Estimates

- **S**: Small (1-2 hours)
- **M**: Medium (3-8 hours)
- **L**: Large (1-2 days)
- **XL**: Extra Large (3+ days)

## High Priority (P1)

### Testing Infrastructure
- **Task**: Add comprehensive test coverage
- **Category**: Testing
- **Priority**: P1
- **Effort**: XL
- **Description**: 
  - Add unit tests for server services
  - Add integration tests for API routes
  - Add component tests for client
  - Add E2E tests for critical flows
  - Target: 80%+ coverage
- **Files**: All layers

### Web Scraping Robustness
- **Task**: Improve PGA Tour data scraping reliability
- **Category**: Technical Debt
- **Priority**: P1
- **Effort**: L
- **Description**:
  - Add retry logic with exponential backoff
  - Add error handling for website changes
  - Add monitoring/alerting for scraping failures
  - Consider alternative data sources
- **Files**: `server/src/lib/pga*.ts`, `server/src/services/updateTournament.ts`

### State Synchronization
- **Task**: Add reconciliation for blockchain/database state
- **Category**: Technical Debt
- **Priority**: P1
- **Effort**: L
- **Description**:
  - Add periodic reconciliation job
  - Detect and fix state inconsistencies
  - Add monitoring for state drift
- **Files**: `server/src/services/`, `server/src/cron/`

## Medium Priority (P2)

### Error Handling Standardization
- **Task**: Standardize error handling patterns
- **Category**: Code Quality
- **Priority**: P2
- **Effort**: M
- **Description**:
  - Create error response utility
  - Standardize error message formats
  - Ensure all routes use consistent error handling
- **Files**: `server/src/routes/*.ts`, `server/src/middleware/errorHandler.ts`

### Type Safety Improvements
- **Task**: Remove `any` types and improve type safety
- **Category**: Code Quality
- **Priority**: P2
- **Effort**: M
- **Description**:
  - Replace `any` types with proper types
  - Add type guards where needed
  - Improve Prisma query typing
- **Files**: `server/src/routes/*.ts`, `client/src/**/*.ts`

### Database Query Optimization
- **Task**: Fix N+1 query patterns
- **Category**: Performance
- **Priority**: P2
- **Effort**: M
- **Description**:
  - Identify N+1 queries
  - Use Prisma includes effectively
  - Add query logging to identify issues
- **Files**: `server/src/routes/*.ts`, `server/src/services/*.ts`

### Cron Job Architecture
- **Task**: Consider job queue system
- **Category**: Architecture
- **Priority**: P2
- **Effort**: L
- **Description**:
  - Evaluate job queue libraries (Bull, BullMQ)
  - Implement job queue for cron tasks
  - Add job monitoring and retry logic
- **Files**: `server/src/cron/scheduler.ts`

### API Response Format Standardization
- **Task**: Standardize API response formats
- **Category**: Code Quality
- **Priority**: P2
- **Effort**: S
- **Description**:
  - Create response utility functions
  - Standardize success/error response formats
  - Update all routes to use standard format
- **Files**: `server/src/routes/*.ts`

## Low Priority (P3)

### Code Cleanup
- **Task**: Remove commented code and TODOs
- **Category**: Code Quality
- **Priority**: P3
- **Effort**: S
- **Description**:
  - Remove commented-out code
  - Address or remove TODO comments
  - Remove debug code from production
- **Files**: `client/src/App.tsx`, `client/src/pages/AccountCUTInfoPage.tsx`

### Documentation Improvements
- **Task**: Add API and component documentation
- **Category**: Documentation
- **Priority**: P3
- **Effort**: M
- **Description**:
  - Add OpenAPI/Swagger documentation
  - Add component documentation (Storybook or similar)
  - Improve contract documentation with examples
- **Files**: `server/src/routes/*.ts`, `client/src/components/**/*.tsx`

### Performance Optimizations
- **Task**: Optimize bundle size and caching
- **Category**: Performance
- **Priority**: P3
- **Effort**: M
- **Description**:
  - Analyze bundle size
  - Implement more aggressive code splitting
  - Improve caching strategies
- **Files**: `client/vite.config.ts`, `client/src/**/*.tsx`

### Abstraction Improvements
- **Task**: Create unified clients and utilities
- **Category**: Architecture
- **Priority**: P3
- **Effort**: M
- **Description**:
  - Create unified API client wrapper
  - Create unified contract interaction client
  - Centralize data transformation logic
- **Files**: `client/src/utils/`, `client/src/hooks/`

### Database Schema Improvements
- **Task**: Consider normalizing JSON fields
- **Category**: Technical Debt
- **Priority**: P3
- **Effort**: XL
- **Description**:
  - Evaluate JSON fields in schema
  - Consider normalizing to proper tables
  - Create migration plan
- **Files**: `server/prisma/schema.prisma`

### Component Refactoring
- **Task**: Split large components
- **Category**: Code Quality
- **Priority**: P3
- **Effort**: M
- **Description**:
  - Identify large components (>300 lines)
  - Split into smaller, focused components
  - Improve separation of concerns
- **Files**: `client/src/components/**/*.tsx`

## Quick Wins (P3, S effort)

### Remove Debug Code
- **Task**: Remove debug pages and utilities
- **Category**: Code Quality
- **Priority**: P3
- **Effort**: S
- **Files**: `client/src/pages/DebugPage.tsx`

### Remove Commented Code
- **Task**: Remove commented-out maintenance overlay
- **Category**: Code Quality
- **Priority**: P3
- **Effort**: S
- **Files**: `client/src/App.tsx`

### Standardize Naming
- **Task**: Document naming conventions
- **Category**: Code Quality
- **Priority**: P3
- **Effort**: S
- **Description**: Create style guide for naming conventions

## Summary

### By Priority
- **P1 (High)**: 3 tasks, ~5-7 days
- **P2 (Medium)**: 5 tasks, ~3-4 days
- **P3 (Low)**: 8 tasks, ~4-5 days

### By Category
- **Testing**: 1 task
- **Technical Debt**: 3 tasks
- **Code Quality**: 5 tasks
- **Performance**: 2 tasks
- **Architecture**: 2 tasks
- **Documentation**: 1 task

### By Effort
- **S (Small)**: 4 tasks
- **M (Medium)**: 6 tasks
- **L (Large)**: 3 tasks
- **XL (Extra Large)**: 2 tasks

## Recommended Order

1. **Quick Wins**: Start with small, easy wins (P3, S)
2. **Error Handling**: Standardize error handling (P2, M)
3. **Type Safety**: Improve type safety (P2, M)
4. **Testing**: Add test infrastructure (P1, XL)
5. **Web Scraping**: Improve robustness (P1, L)
6. **State Sync**: Add reconciliation (P1, L)
7. **Performance**: Optimize queries and bundle (P2, M)
8. **Documentation**: Add API and component docs (P3, M)

## Notes

- Effort estimates are rough and may vary
- Some tasks may be done in parallel
- Prioritize based on current needs and constraints
- Review and update backlog regularly

