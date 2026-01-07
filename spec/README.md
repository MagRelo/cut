# Bet the Cut - Specification Documentation

This directory contains high-level architecture specifications for the Bet the Cut application, organized by layer (contracts, server, client).

## Overview

Bet the Cut is a web application that enables:

- **Fantasy Golf Competitions**: Users create leagues, form teams, and compete in weekly tournaments
- **Real-Money Betting**: Users can place and track bets using data from teams, leagues, or live tournament results
- **PGA Tour Data Integration**: Pulls and displays data from the PGA Tour including player data, tournament results, and schedules

## Architecture Layers

The application is organized into three main layers:

1. **Contracts** (`spec/contracts/`) - Smart contracts on Base blockchain

   - Contest management and prediction markets
   - Token minting and deposit management
   - Economic model implementation

2. **Server** (`spec/server/`) - Node.js backend (Hono/Express)

   - REST API for client communication
   - Database management (Prisma/PostgreSQL)
   - PGA Tour data integration
   - Cron jobs for automated updates

3. **Client** (`spec/client/`) - React frontend (Vite)
   - User interface and interactions
   - Blockchain wallet integration (Wagmi)
   - State management (React Query)
   - Component architecture

## Documentation Structure

Each layer has:

- **README.md** - Overview, key components, dependencies, and quick links
- **architecture.md** - High-level architecture with diagrams
- **data-flow.md** - How data moves through the system
- Additional layer-specific documentation files

## Planning Process

This documentation supports a systematic cleanup process:

### Phase 1: Discovery (Current State)

- Document what exists in each layer
- Map dependencies between layers
- Identify patterns (good and bad)
- List unknowns

### Phase 2: Analysis (Identify Issues)

- Code smells and problematic patterns
- Inconsistencies across layers
- Technical debt
- Missing abstractions
- Documentation gaps

### Phase 3: Prioritization (What to Clean Up)

- Categorize issues by type
- Assess impact (High/Medium/Low)
- Estimate effort
- Create prioritized cleanup backlog

### Phase 4: Execution (Clean Up)

- Work through backlog
- Update specs as code changes
- Validate changes don't break functionality

## Quick Links

### Contracts

- [Contracts Overview](contracts/README.md)
- [Contract Architecture](contracts/architecture.md)
- [Contract Data Flow](contracts/data-flow.md)

### Server

- [Server Overview](server/README.md)
- [Server Architecture](server/architecture.md)
- [API Documentation](server/api.md)
- [Data Models](server/data-models.md)
- [Services](server/services.md)
- [Cron Jobs](server/cron.md)

### Client

- [Client Overview](client/README.md)
- [Client Architecture](client/architecture.md)
- [Component Structure](client/component-structure.md)
- [State Management](client/state-management.md)
- [Client Data Flow](client/data-flow.md)

## How to Use This Documentation

1. **For Understanding**: Start with layer README files to understand what each layer does
2. **For Architecture**: Review architecture.md files to understand how components relate
3. **For Data Flow**: Check data-flow.md files to understand how data moves through the system
4. **For Cleanup**: Use the analysis and backlog to prioritize cleanup efforts

## Maintenance

- Keep specs updated as code changes
- Add new components/patterns as they're introduced
- Document architectural decisions and rationale
- Update cleanup backlog as issues are resolved
