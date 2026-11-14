# Football Match Tracker

A mobile-friendly web app for following selected football teams across tournaments.

## Purpose

The app is intended to make it easy to follow one or more favourite teams during a tournament without repeatedly searching through the tournament website.

The initial implementation is being developed using Fotballfest / CupManager data, with Sandviken/Varegg teams as the first use case.

The design should not be hardcoded to specific teams.

## Planned features

- Select tournament
- Add and remove favourite teams
- Filter teams by:
  - Gender
  - Age
  - Team name
- Search-as-you-type team selection
- Show matches for all selected favourite teams
- Separate matches into:
  - Live / ongoing
  - Upcoming
  - Played
- Show:
  - Team
  - Opponent
  - Match start time
  - Match end time
  - Arena / pitch
  - Score
  - Match status
- Automatically refresh match information
- Mobile-friendly interface
- Installable from the phone home screen

## Tournament architecture

The app should use a common match format rather than being tied directly to one tournament system.

Conceptually:

Tournament source
→ Tournament adapter
→ Common match format
→ Match Tracker

The first adapter will be for CupManager / Fotballfest.

The architecture should allow additional tournament sources, such as Norway Cup, to be added later without redesigning the user interface.

## Favourite teams

Favourite teams should be stored using a stable team ID rather than only the displayed team name.

Users should be able to search for teams using:

Gender → Age → Team name

Age should be presented simply as a number, for example:

12, 13, 14, 15, 16

The application should translate this internally to the tournament system's class/division structure.

Team results should reduce dynamically as letters are entered in the team search field.

## Match information identified in CupManager

CupManager exposes structured match information including:

- Match ID
- Team ID
- Home team
- Away team
- Division
- Stage / round
- Start time
- End time
- Match duration
- Arena / pitch
- Match result
- Live status
- Finished status
- Penalty status
- Walkover status
- Period information

CupManager also exposes relationships for:

- nextMatchWinner
- nextMatchLoser

These may allow the app to show possible future knockout matches before the participating team has been confirmed.

A possible knockout match should be clearly distinguished from a confirmed upcoming match.

## Match status logic

The app should primarily use the tournament source's explicit status rather than guessing match status from the clock.

Examples:

- `live = true` → LIVE
- `finished = true` → PLAYED
- Scheduled and future start time → UPCOMING

Time-based inference should only be used as a fallback.

A score of 0-0 must not automatically be displayed for an unplayed fixture.

Scores should normally only be shown when a match is live or finished.

## Match duration

CupManager provides start time, end time and match duration.

The app should therefore display the actual scheduled interval, for example:

18:00-18:40

rather than estimating match end time from a hardcoded match duration.

## Knockout matches

CupManager contains links such as:

- `nextMatchWinner`
- `nextMatchLoser`

These should be preserved in the data model.

Future functionality could show:

- Confirmed next match
- Possible next match if the team wins
- Possible next match if the team loses

Possible matches should not be presented as confirmed fixtures.

## Technology

Initial stack:

- Next.js
- React
- TypeScript
- GitHub
- Vercel

GitHub stores the source code.

Vercel builds and hosts the application.

The CupManager integration should run server-side where practical, rather than requiring the user's phone to communicate directly with CupManager.

## Development

Built with Next.js and deployed through Vercel.

GitHub repository:

`acringdal/football-match-tracker`

Production branch:

`main`

## Current development status

The initial Next.js project structure has been created with:

- `app/layout.tsx`
- `app/page.tsx`
- `package.json`

The first user interface contains:

- My Matches
- Follow your favourite teams
- Add favourite team
- Empty state for users with no selected teams

The next development milestone is to establish a successful automatic deployment from the GitHub `main` branch to Vercel.

After deployment is working, development will move to:

1. CupManager data adapter
2. Tournament/division retrieval
3. Gender and numeric age filtering
4. Search-as-you-type team selection
5. Favourite team storage
6. Match retrieval
7. Live / Upcoming / Played match cards
8. Knockout progression support
9. Norway Cup compatibility testing
