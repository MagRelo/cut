# Player Data Structure Comparison

This document compares our database Player model with the SportsRadar API player interface.

## Field Comparison Table

| Database Field (schema.prisma) | SportsRadar API Field | Notes                                                                               |
| ------------------------------ | --------------------- | ----------------------------------------------------------------------------------- |
| id (String)                    | id                    | Primary identifier in our DB (cuid)                                                 |
| pgaTourId (String?)            | id                    | SportsRadar's UUID stored as pgaTourId                                              |
| name (String)                  | name                  | Full name in "LastName, FirstName" format                                           |
| firstName (String?)            | first_name            | First name component                                                                |
| lastName (String?)             | last_name             | Last name component                                                                 |
| displayName (String?)          | abbr_name             | Abbreviated name (e.g., "D.Johnson")                                                |
| imageUrl (String?)             | -                     | Custom field for player images                                                      |
| country (String?)              | country               | Country representation differs (API: "UNITED STATES", DB: likely normalized format) |
| countryFlag (String?)          | -                     | Custom field for country flag images                                                |
| age (Int?)                     | -                     | Calculated from birthday in API                                                     |
| inField (Boolean)              | -                     | Custom field for tournament participation                                           |
| isActive (Boolean)             | -                     | Custom field for player status                                                      |

## Fields in SportsRadar API not in Database

1. Physical Characteristics:

   - `height`: Number (in inches)
   - `weight`: Number (in pounds)

2. Personal Information:

   - `birthday`: String (ISO date format)
   - `residence`: String (current residence)
   - `birth_place`: String (place of birth)
   - `college`: String (alma mater)

3. Professional Details:
   - `turned_pro`: Number (year)
   - `member`: Boolean (membership status)
   - `updated`: String (last update timestamp)
   - `handedness`: String (R/L)

## Fields in Database not in API

1. UI/Display Fields:

   - `imageUrl`: String? (player profile image)
   - `countryFlag`: String? (country flag image)
   - `displayName`: String? (formatted display name)

2. Status Tracking:

   - `inField`: Boolean (tournament participation)
   - `isActive`: Boolean (player active status)

3. Metadata:
   - `createdAt`: DateTime
   - `updatedAt`: DateTime

## Data Flow Considerations

1. Name Handling:

   - API provides separate `first_name`, `last_name`, and formatted `name`
   - Database stores these separately but also maintains a main `name` field
   - API's `abbr_name` maps to our `displayName`

2. Identification:

   - We maintain our own `id` using cuid
   - Store SportsRadar's ID as `pgaTourId`
   - `pgaTourId` is optional, allowing for manual player entries

3. Country Information:

   - API provides country in uppercase format ("UNITED STATES")
   - Database likely stores normalized country names
   - Additional `countryFlag` field for UI enhancement

4. Status Tracking:
   - Database adds custom boolean flags for tracking tournament participation and player status
   - These fields support our application's specific needs

## Recommendations for Future Consideration

Consider adding the following fields to enhance parity with the API data:

1. Physical Information:

   - `height`: Int? (in inches)
   - `weight`: Int? (in pounds)
   - `handedness`: String? (R/L)

2. Biographical Data:

   - `birthDate`: DateTime?
   - `birthPlace`: String?
   - `residence`: String?
   - `college`: String?
   - `turnedPro`: Int? (year)

3. Professional Status:
   - `isTourMember`: Boolean?
   - `lastUpdatedFromApi`: DateTime?

These additions would provide more complete player profiles while maintaining our current functionality. However, the necessity of these fields should be evaluated based on actual application requirements and use cases.

## Notes on Relationships

Our database model includes additional relationships not present in the API data:

- `teams`: Relation to TeamPlayer model
- `tournaments`: Relation to TournamentPlayer model

These relationships are crucial for our application's fantasy golf functionality but are not part of the raw API player data.

## New plan for player data

We'll basically make the database player table behave like this:

- Base Data: everything from the sportsradar API
- Additional optional PGA data (fields prefixed with "pga_fieldName")
- helpful status fields (isActive, inField)
- metadata fields (createdAt, etc)
