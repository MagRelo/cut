# League Lobby - Layout and Descriptions

The league lobby is a central point of interaction for Users. The layout is designed to be responsive and user-friendly on both mobile and desktop devices.

## Sections

1. League Info: name, description only
2. Tournament Info: name, location, course, status, etc.
3. Chat: live chat for Users of that league to interact
4. Team List: List of teams in the league and their scores, players, name, etc.
5. Create/Edit Team Form: Form for creating or editing a team
6. Bet Form: Form for placing bets & List of User's open bets
7. League Settings: the league settings & the 'Leave League' button.

## Layout

### Mobile & Tablet

All sections are arranged into a tabbed interface with icons & labels representing each section. The order of the sections from left to right is: 3, 4, 5, 6, 7. Sections 1 & 2 are summarized and combined above the tab section, and are fixed in place & height. The tab sections can scroll to accommodate long content.

### Desktop

The layout is constrained to a maximum width to ensure consistency across different screen sizes. The content is organized in a two-row structure:

```
┌─────────────────────────────────┐
│    1 (75%)         │    2 (25%) │  Row 1: League & Tournament Info
├────────────────────┴────────────┤
│                    │            │
│                    │    4,5,6,7 │  Row 2: Main Content
│         3          │   (Tabbed  │
│     (Chat)         │  Interface)│  3:2 ratio between
│      60%          │     40%    │  chat and right column
│                    │            │
└────────────────────┴────────────┘
```

The desktop layout features:

- A fixed maximum width container
- Top row split between League Info (75%) and Tournament Info (25%)
- Bottom row split in a 3:2 ratio between:
  - Left: Chat section (60%)
  - Right: Tabbed interface (40%) containing:
    - Teams List
    - Create/Edit Team Form (when applicable)
    - Bet Form
    - Open Bets List
- Each column in the bottom row scrolls independently if content exceeds the viewport height
- The right column uses tabs at the top to switch between different sections
