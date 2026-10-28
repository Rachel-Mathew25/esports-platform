# Purvitha's tasks: Tournaments and test cases

Rachel has finished the rest of the backend and UI. These three pieces are yours. Together they cover the rubric's requirement that both team members touch the database and the application, with individual commits.

1. Tournament API routes (create, list, join).
2. The /tournaments page.
3. tests/test_cases.md.

## Getting started

Rachel adds you as a collaborator first (GitHub repo, Settings, Collaborators). Then:

    git clone https://github.com/Rachel-Mathew25/esports-platform.git
    cd esports-platform
    git checkout -b feature/tournaments

Follow the setup steps in the root README.md (database, MongoDB, .env.local, npm install, npm run dev). Commit in small steps under your own git identity, for example one commit per route and one for the page:

    git config user.name "Your Name"
    git config user.email "your-github-email"
    git push -u origin feature/tournaments

Then open a pull request into main and Rachel merges it, so the history shows your commits.

## 1. Tournament routes

First check the real tables, because column details matter:

    mysql -u root -p esports_platform -e "SHOW CREATE TABLE tournaments\G SHOW CREATE TABLE tournament_participants\G"

Tournaments have game_id, name, start_date, end_date, status (upcoming, ongoing, completed, cancelled) and created_by. tournament_participants links tournament_id, player_id, seed and registered_at.

Create these files under web/app/api/tournaments/:

| Route | File | Access | Behaviour |
|---|---|---|---|
| POST /api/tournaments | route.js | admin, staff | Body: game_id, name, start_date, end_date. Validate every field, check the game exists (404), check end_date is not before start_date (400). Set created_by from the session. Return 201. |
| GET /api/tournaments | route.js | any logged-in role | List tournaments with the game title and a participant count (JOIN plus GROUP BY). Optional status filter. |
| POST /api/tournaments/[id]/join | [id]/join/route.js | player | In one transaction: lock the tournament row (SELECT ... FOR UPDATE), check it exists (404) and is upcoming (409), check the player is not already registered (409), insert into tournament_participants, commit. Roll back on any error. Return 201. |

Follow the existing routes as a pattern, for example web/app/api/queue/join/route.js and web/app/api/matchmaking/run/route.js (transaction with rollback).

Conventions used throughout this project:

- import { pool } from "@/lib/mysql" (named export, not default).
- requireRole(request, ["admin", "staff"]) returns { error, status } or { session }. Use auth.session.id for the user id (the JWT key is id, not user_id).
- players.player_id is the same number as users.user_id.
- Dynamic params: const { id } = await params;
- Quote paths with brackets in zsh: "web/app/api/tournaments/[id]/join/route.js".
- Never hard-code credentials. Everything comes from .env.local.

Test each route with curl before building the page. See "Verified behaviours" below for the curl login pattern.

## 2. The /tournaments page

Create web/app/tournaments/page.js as a client component. Use web/app/leaderboard/page.js and web/app/dashboard/page.js as references, and the existing classes in globals.css (card, table-wrap, btn, error, success, row).

- Show the tournament list with game, dates, status and participant count.
- Players see a Join button on upcoming tournaments. Show the API error text on failure (for example "already registered").
- Admin and staff see a create form (game dropdown from GET /api/games, name, dates).
- Logged-out visitors are redirected to /login.

Add a link in web/components/Nav.js next to the Leaderboard link.

## 3. tests/test_cases.md

Write a table with the columns ID, Feature, Steps, Expected result, Actual result, Pass or fail. Start from the verified behaviours below, add your tournament tests, and run each one yourself so the Actual column is real. Include screenshots in docs/ if you can.

## Verified behaviours (already tested by Rachel)

Auth and roles:

- Duplicate username or email on register gives 409 and leaves no orphan rows.
- Short password or bad email gives 400.
- A player calling an admin route gives 403. No cookie gives 401.
- Staff role: matchmaking gives 200, settling a finished match gives 409, players/me and queue join give 403.
- Admin accounts cannot join queues (403) because they have no player row.

Queue and matchmaking:

- Joining a queue twice gives 409. Unknown game gives 404. Missing game_id gives 400.
- Matchmaking with elo_range 100 pairs nobody (1460 vs 1310). The default range of 200 creates a match. A second run creates nothing (no double matching). elo_range -5 gives 400. Players get 403.
- Cancelling someone else's queue entry gives 404. Cancelling your own gives 200, and cancelling it again gives 404. A body of {} gives 400. No cookie gives 401.
- A player can cancel twice for the same game (two cancelled rows).
- Regression: a player can be matched again after an earlier match. The original unique key on (player_id, game_id, status) blocked this and caused a 500. The fix is db/mysql/alter_queue_index.sql (a generated column enforcing one waiting row per player and game).

Settling and ELO:

- Settling updates ELO through the trigger. Match 8: Alice +11, Bob -11, and elo_history gets two rows.
- Settling a finished match gives 409. Settling a missing match gives 404.

MongoDB:

- Event without cookie gives 401. Admin posts an event and gets 201. Player not in the match gives 400. Bad type gives 400. Missing match gives 404. Player role gives 403.
- Kills analytics without cookie gives 401. With admin it returns per-player kills and headshot percentage. limit=0 gives 400.

Player profile:

- players/me without cookie gives 401, as admin 403, as a player 200 with stats, history and waiting_in.

Still to add (you):

- DB-level validation: a negative ELO is rejected by the CHECK constraint. Try it inside BEGIN; UPDATE player_game_stats SET elo_rating = -1 WHERE player_id = 2 AND game_id = 3; ROLLBACK; and record the error.
- A forced failed transaction rolls back (for example, joining a tournament that does not exist or is already registered, and showing no partial rows).
- All your tournament tests.

## curl setup

Log in once per role and reuse the cookie file:

    curl -s -c /tmp/admin.txt -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"rachel@test.com","password":"password123"}'
    curl -s -w "\nHTTP %{http_code}\n" -b /tmp/admin.txt http://localhost:3000/api/tournaments

The dev server must be running (HTTP 000 means it is not). Cookies expire, so a sudden 401 usually means log in again.

## Demo data note

Queue rows, matches and ELO values change as you test. To reset the database to the demo state, reload db/mysql/full_dump.sql into a freshly created esports_platform database, and run mongosh < db/mongo/setup.js for MongoDB.
