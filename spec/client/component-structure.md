# Client Component Structure

## Component Organization

Components are organized by feature/domain:

```
components/
├── common/          # Shared components
├── contest/         # Contest-related components
├── lineup/          # Lineup management components
├── player/           # Player display components
├── tournament/       # Tournament display components
├── user/            # User account components
└── userGroup/       # User group components
```

## Common Components

### Navigation & Layout
- **Navigation.tsx**: Main navigation bar
- **Footer.tsx**: Site footer
- **PageHeader.tsx**: Page header component
- **Breadcrumbs.tsx**: Breadcrumb navigation

### UI Elements
- **Modal.tsx**: Reusable modal component
- **LoadingSpinner.tsx**: Loading indicator
- **LoadingSpinnerSmall.tsx**: Small loading indicator
- **ErrorMessage.tsx**: Error message display
- **CopyToClipboard.tsx**: Copy to clipboard utility

### Blockchain
- **ChainWarning.tsx**: Wrong chain warning
- **NetworkStatus.tsx**: Network status indicator
- **ProtectedRoute.tsx**: Route protection (auth required)

### Data Display
- **CutAmountDisplay.tsx**: Token amount display
- **InfoScorecard.tsx**: Scorecard information display
- **Share.tsx**: Share functionality

### Error Handling
- **GlobalErrorOverlay.tsx**: Global error overlay
- **MaintenanceOverlay.tsx**: Maintenance mode overlay

## Contest Components

### Contest Management
- **ContestCard.tsx**: Contest card display
- **ContestList.tsx**: List of contests
- **CreateContestForm.tsx**: Create contest form
- **ContestSettings.tsx**: Contest settings

### Contest Display
- **ContestLobbyPage.tsx**: Main contest page (page component)
- **ContestStatusProgressBar.tsx**: Status progress indicator
- **ContestResultsPanel.tsx**: Results display
- **ContestPayoutsModal.tsx**: Payout information modal

### Contest Lineups
- **LineupManagement.tsx**: Manage lineups in contest
- **ContestEntryList.tsx**: List of contest entries
- **ContestEntryModal.tsx**: Entry details modal
- **ContestPlayerList.tsx**: Players in contest
- **EntryHeader.tsx**: Entry header display

### Predictions
- **ContestPredictionsTab.tsx**: Predictions tab
- **PredictionEntryForm.tsx**: Prediction entry form
- **PredictionEntryModal.tsx**: Prediction entry modal
- **PredictionEntryPosition.tsx**: Prediction position display
- **PredictionLineupsList.tsx**: List of prediction lineups
- **PredictionPositionsList.tsx**: List of prediction positions
- **PredictionClaimPanel.tsx**: Claim prediction winnings

### Timeline
- **Timeline.tsx**: Contest timeline visualization

## Lineup Components

### Lineup Management
- **LineupCard.tsx**: Lineup card display
- **LineupForm.tsx**: Lineup creation/edit form
- **LineupContestCard.tsx**: Contest card in lineup context

### Player Selection
- **PlayerSelectionButton.tsx**: Player selection button
- **PlayerSelectionCard.tsx**: Player selection card
- **PlayerSelectionModal.tsx**: Player selection modal

## Player Components

- **PlayerDisplayCard.tsx**: Player card display
- **PlayerDisplayRow.tsx**: Player row display
- **PlayerScorecard.tsx**: Player scorecard display

## Tournament Components

- **TournamentHeaderPanel.tsx**: Tournament header
- **TournamentInfoPanel.tsx**: Tournament information
- **TournamentSummaryModal.tsx**: Tournament summary modal
- **CountdownTimer.tsx**: Tournament countdown timer

## User Components

### Authentication
- **Connect.tsx**: Wallet connection component

### Token Operations
- **Buy.tsx**: Buy tokens (USDC → CUT)
- **Sell.tsx**: Sell tokens (CUT → USDC)
- **Send.tsx**: Send tokens
- **Receive.tsx**: Receive tokens display
- **TokenBalances.tsx**: Token balance display
- **MintingUserFundsPanel.tsx**: Minting status panel

### Account
- **UserSettings.tsx**: User settings component

## User Group Components

- **UserGroupCard.tsx**: User group card
- **UserGroupForm.tsx**: User group form
- **UserGroupList.tsx**: List of user groups
- **UserGroupMemberManagement.tsx**: Member management
- **UserGroupMembersList.tsx**: Members list
- **UserGroupSettings.tsx**: User group settings

## Component Patterns

### Container/Presentational Pattern
- **Container Components**: Handle data fetching and logic
- **Presentational Components**: Display data and handle UI

### Compound Components
- Some components use compound component pattern
- Example: Modal with Modal.Header, Modal.Body, Modal.Footer

### Controlled Components
- Form components are controlled
- State managed by React Hook Form
- Validation via Yup/Zod schemas

## Component Props Patterns

### Standard Props
```typescript
interface ComponentProps {
  id: string;
  data: DataType;
  onAction: (id: string) => void;
  className?: string;
}
```

### Children Pattern
```typescript
interface ComponentProps {
  children: React.ReactNode;
  title?: string;
}
```

### Render Props (if used)
```typescript
interface ComponentProps {
  render: (data: DataType) => React.ReactNode;
}
```

## Component State Management

### Local State
- `useState` for component-local state
- Form state managed by React Hook Form

### Context State
- `usePortoAuth()` for user/auth state
- `useGlobalError()` for error state

### Server State
- React Query hooks for server data
- Custom hooks wrap React Query

### Blockchain State
- Wagmi hooks for blockchain data
- Custom hooks wrap Wagmi

## Component Communication

### Parent → Child
- Props for data and callbacks
- Context for shared state

### Child → Parent
- Callback props
- Context updates (via hooks)

### Sibling Components
- Shared context
- Shared React Query cache
- Event system (if needed)

## Reusability Patterns

### Custom Hooks
- Extract reusable logic
- Used across multiple components
- Examples: `useContestQuery`, `useLineupData`

### Higher-Order Components (if used)
- Wrap components with shared logic
- Less common in modern React

### Render Props (if used)
- Share logic between components
- Less common with hooks

## Styling Patterns

### Tailwind CSS
- Utility-first CSS
- Component classes
- Responsive design utilities

### Component Styling
- Inline styles for dynamic values
- Tailwind classes for static styles
- CSS modules (if used)

## Testing Considerations

### Component Testing
- Test presentational components in isolation
- Mock hooks and context
- Test user interactions

### Integration Testing
- Test component interactions
- Test with real hooks (if possible)
- Test error states

