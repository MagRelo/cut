# Express to Hono Migration Task List

This document outlines the complete migration plan from Express.js 5.1 to Hono framework.

## Overview

Hono is a modern, lightweight web framework that offers better performance, TypeScript support, and edge runtime compatibility. This migration will improve the application's performance and maintainability.

## Completed Tasks

- [x] Document current Express.js API routing structure
- [x] Create comprehensive migration task list
- [x] Research Hono framework features and best practices
- [x] Complete Phase 1: Setup and Dependencies
- [x] Complete Phase 2: Core Application Structure
- [x] Complete Phase 3: Route Migration
- [x] Complete Phase 4: Static File Serving
- [x] Complete Phase 5: Middleware and Utilities
- [x] Complete Phase 6: TypeScript and Type Safety
- [x] Complete Phase 7: Testing and Validation

## Current Status

**✅ PHASES 1, 2, 3, 4, 5, 6, 7 & 8 COMPLETE** - Full Hono server with comprehensive testing and complete library/services/cron migration!

- **Express Server**: Running on port 3000 (original implementation)
- **Hono Server**: Running on port 3000 (new implementation with all routes and static files)
- **Health Endpoints**: Both servers have working health checks
- **Middleware**: CORS, logging, authentication, and error handling implemented and enhanced
- **Environment**: Full compatibility with existing environment variables
- **TypeScript**: Enhanced type safety with comprehensive type definitions and strict configuration
- **All Routes Migrated**: Authentication, Tournament, Lineup, Contest, Cron, and Porto integration
- **Porto Integration**: Using official Hono adapter (`porto.hono`)
- **TypeScript Config**: Enhanced with strict type checking and comprehensive type definitions
- **Static File Serving**: Complete with caching headers and SPA routing support
- **Enhanced Middleware**: Authentication supports both Bearer tokens and cookies, error handling with specific error types, optimized logging
- **Comprehensive Testing**: Full test suite with 42 passing tests covering app functionality, middleware, and error handling
- **Performance Testing**: Performance measurement utilities and load testing framework implemented

**Next**: Ready to begin Phase 9 - Documentation and Cleanup.

## Future Tasks

### Phase 1: Setup and Dependencies ✅ COMPLETED

- [x] Install Hono and related dependencies

  - [x] `pnpm add hono` (installed v4.9.7)
  - [x] `pnpm add @hono/node-server` (installed v1.19.3 for Node.js compatibility)
  - [x] **LEARNED**: CORS middleware is built into Hono core (`hono/cors`)
  - [x] **LEARNED**: Logger middleware is built into Hono core (`hono/logger`)
  - [x] **LEARNED**: Cookie handling is built into Hono core (`hono/cookie`)
  - [x] **LEARNED**: JWT functionality can be handled with existing `jsonwebtoken` package

- [x] Keep Express.js dependencies during parallel migration

  - [x] **STRATEGY**: Keep Express running alongside Hono for gradual migration
  - [x] **STRATEGY**: Use different ports (Express: 3000, Hono: 3001) to avoid conflicts
  - [x] **STRATEGY**: Remove Express dependencies after full migration is complete

- [x] Update package.json scripts and dependencies

  - [x] Added Hono dependencies to existing package.json
  - [x] Maintained all existing Express functionality

### Phase 2: Core Application Structure ✅ COMPLETED

- [x] Create new Hono app instance (`server/app.ts`)

  - [x] Initialize Hono app with proper TypeScript setup
  - [x] Configure CORS middleware using `hono/cors`
  - [x] Configure logging middleware using `hono/logger`
  - [x] **LEARNED**: Cookie middleware handled per-route, not globally
  - [x] **LEARNED**: Body parsing is automatic in Hono (no explicit middleware needed)

- [x] Migrate main server file (`server/index.ts`)

  - [x] Replace Express app initialization with Hono using `@hono/node-server`
  - [x] Update server startup logic with `serve()` function
  - [x] Migrate graceful shutdown handling (SIGTERM/SIGINT)
  - [x] Update environment variable validation (identical to Express)

- [x] Create Hono middleware modules

  - [x] `server/middleware/auth.ts` - JWT authentication middleware with context extension
  - [x] `server/middleware/errorHandler.ts` - Error handling middleware
  - [x] **LEARNED**: Logger middleware is built-in, no separate file needed

- [x] Create basic API routes structure
  - [x] `server/routes/api.ts` - Main API router with health endpoint
  - [x] **LEARNED**: Hono uses `.route()` method for sub-routers
  - [x] **LEARNED**: Error handling must be registered last with `.onError()` and `.notFound()`

### Phase 3: Route Migration ✅ COMPLETED

- [x] Migrate authentication routes (`server/routes/auth.ts`)

  - [x] Convert Express Router to Hono route handlers
  - [x] Update SIWE nonce endpoint
  - [x] Update SIWE verification endpoint
  - [x] Update SIWE logout endpoint
  - [x] Update user profile endpoints
  - [x] Update user settings endpoints
  - [x] **LEARNED**: Use `c.req.json()` for body parsing, `c.req.param()` for params

- [x] Migrate tournament routes (`server/routes/tournament.ts`)

  - [x] Convert Express Router to Hono route handlers
  - [x] Update active tournament endpoint
  - [x] **LEARNED**: Direct database queries work identically in Hono

- [x] Migrate lineup routes (`server/routes/lineup.ts`)

  - [x] Convert Express Router to Hono route handlers
  - [x] Update lineup creation endpoint
  - [x] Update lineup update endpoint
  - [x] Update lineup retrieval endpoints
  - [x] **LEARNED**: Complex nested data transformations work seamlessly

- [x] Migrate contest routes (`server/routes/contest.ts`)

  - [x] Convert Express Router to Hono route handlers
  - [x] Update contest CRUD endpoints
  - [x] Update contest lineup management endpoints
  - [x] **LEARNED**: Query parameters accessed via `c.req.query()`

- [x] Migrate cron routes (`server/routes/cron.ts`)

  - [x] Convert Express Router to Hono route handlers
  - [x] Update cron status endpoint
  - [x] **LEARNED**: Simple routes migrate with minimal changes

- [x] Migrate Porto integration (`server/routes/porto.ts`)

  - [x] Update Porto router integration using official Hono adapter (`porto.hono`)
  - [x] Ensure compatibility with Hono middleware stack
  - [x] **LEARNED**: Porto has built-in Hono adapter - no manual wrapper needed

- [x] Fix TypeScript configuration and Node.js types
  - [x] Install `@types/node` for proper Node.js type support
  - [x] Update `tsconfig.json` to include `server/**/*` directory
  - [x] **LEARNED**: Proper TypeScript configuration essential for Node.js modules

### Phase 4: Static File Serving ✅ COMPLETED

- [x] Implement static file serving in Hono

  - [x] Configure static file middleware using `serveStatic` from `hono/serve-static`
  - [x] Set up caching headers with `Cache-Control: public, max-age=3600`
  - [x] Configure ETag and Last-Modified headers for cache validation
  - [x] Test static asset delivery
  - [x] **LEARNED**: Hono's `serveStatic` requires custom `getContent` function

- [x] Implement client-side routing support
  - [x] Create catch-all route for SPA routing
  - [x] Configure no-cache headers for HTML files
  - [x] Test client-side navigation
  - [x] **LEARNED**: Serve actual `index.html` file instead of hardcoded HTML

### Phase 5: Middleware and Utilities ✅ COMPLETED

- [x] Update authentication middleware

  - [x] Convert JWT verification to Hono middleware
  - [x] Update user context handling
  - [x] **ENHANCED**: Added support for both Bearer token and cookie authentication
  - [x] **ENHANCED**: Improved error handling with specific error messages

- [x] Update error handling

  - [x] Convert error handlers to Hono middleware
  - [x] Update 404 handling
  - [x] **ENHANCED**: Added specific error type handling (ValidationError, UnauthorizedError, etc.)
  - [x] **ENHANCED**: Consistent error response format matching Express implementation

- [x] Update request logging
  - [x] Convert logger to Hono middleware
  - [x] **ENHANCED**: Added conditional logging (skip OPTIONS, log errors in production)
  - [x] **ENHANCED**: Environment-aware logging configuration

### Phase 6: TypeScript and Type Safety ✅ COMPLETED

- [x] Update TypeScript configurations

  - [x] Ensure Hono types are properly configured
  - [x] Update route handler type definitions
  - [x] Update middleware type definitions
  - [x] **ENHANCED**: Added strict TypeScript configuration with comprehensive type checking

- [x] Create Hono-specific type definitions
  - [x] Define route handler types
  - [x] Define middleware types
  - [x] Define context types
  - [x] **ENHANCED**: Created comprehensive type definitions for all application components

### Phase 7: Testing and Validation ✅ COMPLETED

- [x] Update test configurations

  - [x] Update test setup for Hono
  - [x] Update API endpoint tests
  - [x] Update middleware tests
  - [x] **ENHANCED**: Created comprehensive test utilities and HonoTestClient

- [x] Comprehensive testing

  - [x] Test all API endpoints
  - [x] Test authentication flow
  - [x] Test static file serving
  - [x] Test client-side routing
  - [x] Test Porto integration
  - [x] Test error handling
  - [x] **ENHANCED**: 42 passing tests covering all major functionality

- [x] Performance testing
  - [x] Compare performance with Express
  - [x] Test memory usage
  - [x] Test response times
  - [x] **ENHANCED**: Created PerformanceTester utility and load testing framework

### Phase 8: Library, Services, and Cron Migration ✅ COMPLETED

- [x] Migrate library utilities (`src/lib/`)

  - [x] Copy all utility functions from Express `src/lib/` to Hono `server/lib/`
  - [x] Update imports and dependencies for Hono compatibility
  - [x] Test utility functions with Hono context
  - [x] Update TypeScript types for Hono-specific usage

- [x] Migrate service layer (`src/services/`)

  - [x] Copy all service modules from Express `src/services/` to Hono `server/services/`
  - [x] Update service imports to work with Hono server structure
  - [x] Ensure database connections and external API integrations work correctly
  - [x] Test service layer functionality with Hono routes

- [x] Migrate cron functionality (`src/cron/`)

  - [x] Copy cron scheduler and job definitions from Express `src/cron/` to Hono `server/cron/`
  - [x] Update cron route handlers to work with Hono
  - [x] Ensure cron jobs can access Hono services and database connections
  - [x] Test cron job execution and scheduling
  - [x] Verify cron status endpoints work correctly

- [x] Update import paths and dependencies

  - [x] Update all import statements to reference new Hono server structure
  - [x] Ensure proper module resolution for moved files
  - [x] Update TypeScript path mappings if needed
  - [x] Test all imports resolve correctly

- [x] Migrate schemas (`src/schemas/`)

  - [x] Copy all schema files from Express `src/schemas/` to Hono `server/schemas/`
  - [x] Update schema imports to work with Hono server structure
  - [x] Ensure schema validation works correctly with Hono routes

### Phase 9: Documentation and Cleanup

- [ ] Update API documentation

  - [ ] Update route documentation
  - [ ] Update middleware documentation
  - [ ] Update deployment documentation

- [ ] Clean up old Express code

  - [ ] Remove unused Express imports
  - [ ] Remove Express-specific configurations
  - [ ] Clean up package.json

- [ ] Update deployment configurations
  - [ ] Update Docker configurations if needed
  - [ ] Update environment variable documentation
  - [ ] Update startup scripts

## Key Lessons Learned

### Hono Framework Insights

1. **Built-in Middleware**: CORS, logger, and cookie handling are built into Hono core - no separate packages needed
2. **Cookie Handling**: Unlike Express, cookies are handled per-route using `getCookie()` and `setCookie()` functions
3. **Body Parsing**: Automatic body parsing in Hono - no explicit middleware required
4. **Context Extension**: Use TypeScript module declaration to extend Hono's context with custom variables
5. **Error Handling**: Must register error handlers last using `.onError()` and `.notFound()` methods
6. **Sub-routers**: Use `.route()` method to mount sub-routers instead of Express's `.use()`
7. **Import Syntax**: Hono middleware uses named imports (e.g., `import { cors } from 'hono/cors'`)
8. **Porto Integration**: Porto has built-in Hono adapter (`porto.hono`) - no manual wrapper needed

### Migration Strategy Refinements

1. **Parallel Development**: Successfully running Express (port 3000) and Hono (port 3001) simultaneously
2. **Gradual Migration**: Route-by-route migration approach working well
3. **Environment Compatibility**: Hono works seamlessly with existing environment setup
4. **TypeScript Integration**: Excellent TypeScript support with proper type inference
5. **Middleware Enhancement**: Hono middleware can be enhanced beyond Express functionality
6. **Error Handling**: Hono's error handling is more flexible and type-safe
7. **Authentication**: Dual token support (Bearer + cookie) improves API flexibility

## Implementation Plan

### Key Differences Between Express and Hono

1. **Route Definition**: Hono uses a more functional approach with method chaining
2. **Middleware**: Hono middleware is more composable and type-safe, many built-in
3. **Context**: Hono provides a unified context object for requests/responses with TypeScript support
4. **TypeScript**: Better TypeScript support out of the box with context extension
5. **Performance**: Hono is generally faster and more memory efficient
6. **Import Strategy**: Named imports for middleware vs Express's default imports

### Migration Strategy

1. **Incremental Migration**: Migrate one route module at a time
2. **Parallel Development**: Keep Express version running during migration
3. **Feature Parity**: Ensure all existing functionality is preserved
4. **Testing**: Comprehensive testing at each phase
5. **Rollback Plan**: Maintain ability to rollback to Express if needed

### Risk Mitigation

- **Backup**: Create full backup of current Express implementation
- **Feature Flags**: Use environment variables to switch between frameworks
- **Gradual Rollout**: Deploy to staging environment first
- **Monitoring**: Enhanced monitoring during migration period

## Relevant Files

### Express Implementation (Original)

- `server/src/index.ts` - Main Express server entry point ✅
- `server/src/routes/api.ts` - Main Express API router ✅
- `server/src/routes/auth.ts` - Express authentication routes ✅
- `server/src/routes/tournament.ts` - Express tournament routes ✅
- `server/src/routes/lineup.ts` - Express lineup management routes ✅
- `server/src/routes/contest.ts` - Express contest management routes ✅
- `server/src/routes/cron.ts` - Express cron job routes ✅
- `server/src/routes/porto.ts` - Express Porto integration routes ✅
- `server/src/middleware/auth.ts` - Express authentication middleware ✅
- `server/src/middleware/logger.ts` - Express request logging middleware ✅
- `server/src/middleware/errorHandler.ts` - Express error handling middleware ✅

### Hono Implementation (New)

- `server/server/index.ts` - Main Hono server entry point ✅
- `server/server/app.ts` - Hono application with middleware setup ✅
- `server/server/routes/api.ts` - Hono API router structure ✅
- `server/server/middleware/auth.ts` - Hono authentication middleware ✅
- `server/server/middleware/errorHandler.ts` - Hono error handling middleware ✅

### Configuration Files

- `server/package.json` - Dependencies and scripts (updated with Hono) ✅
- `server/tsconfig.json` - TypeScript configuration ✅

## Success Criteria

- [ ] All API endpoints function identically to Express version
- [ ] Authentication and authorization work correctly
- [ ] Static file serving works correctly
- [ ] Client-side routing works correctly
- [ ] Porto integration functions correctly
- [ ] Performance is equal or better than Express version
- [ ] All tests pass
- [ ] Documentation is updated
- [ ] Zero breaking changes for client applications
