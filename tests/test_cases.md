# Test Cases: Tournaments (Purvitha)

Environment: local MySQL 8.0 (`esports_platform`), Next.js dev server, demo data from `db/mysql/full_dump.sql`. All results below were observed on the running system.

## 1. Database-level tests

Each test ran inside `START TRANSACTION; ... ROLLBACK;` so the data was left unchanged.

| ID | Test | Steps | Expected | Actual | Result |
|---|---|---|---|---|---|
| DB-1 | Negative ELO is rejected | `UPDATE player_game_stats SET elo_rating = -1 WHERE player_id = 2 AND game_id = 3;` | CHECK violation | `ERROR 3819: Check constraint 'chk_elo_positive' is violated.` | Pass |
| DB-2 | Tournament end date before start date is rejected | `INSERT INTO tournaments (...) VALUES (3, 'Bad Dates Cup', '2026-12-10', '2026-12-01', 1);` | CHECK violation | `ERROR 3819: Check constraint 'chk_tourn_dates' is violated.` | Pass |
| DB-3 | `team_number = 3` is rejected | `UPDATE match_players SET team_number = 3 WHERE match_id = 1 LIMIT 1;` | CHECK violation | `ERROR 3819: Check constraint 'chk_team_number' is violated.` | Pass |
| DB-4 | Duplicate tournament registration is rejected | `INSERT INTO tournament_participants (tournament_id, player_id) VALUES (1, 2);` (player 2 already registered) | Duplicate key error | `ERROR 1062: Duplicate entry '1-2' for key 'tournament_participants.PRIMARY'` | Pass |
| DB-5 | Deleting a tournament sets `matches.tournament_id` to NULL (ON DELETE SET NULL) | Insert temp tournament, point match 1 at it, delete the tournament, select the match | `tournament_id` becomes NULL | Before delete: `tournament_id = 2`. After delete: `NULL` | Pass |
| DB-6 | A failed insert rolls back the whole transaction | Insert a user, then insert a `players` row with `display_name = NULL`, then `ROLLBACK` | Second insert fails; no leftover user | `ERROR 1048: Column 'display_name' cannot be null`; leftover count = 0 | Pass |

## 2. API tests

| ID | Test | Request | Expected | Actual | Result |
|---|---|---|---|---|---|
| API-1 | List tournaments (empty) | `GET /api/tournaments` | 200, `[]` | 200, `[]` | Pass |
| API-2 | Create tournament as admin | `POST /api/tournaments` as rachel@test.com | 201 | 201, `tournament_id: 1` | Pass |
| API-3 | Create tournament with no login | `POST /api/tournaments`, no cookie | 401 | 401 `Unauthorized` | Pass |
| API-4 | Create tournament as staff | `POST` as sam@esports.com | 201 | 201, tournament_id 3 created | Pass |
| API-5 | Create tournament as player | `POST` as alice | 403 | 403 Forbidden | Pass |
| API-6 | Create with name too short | `name: "x"` as admin | 400 | 400 "name must be 3 to 100 characters" | Pass |
| API-7 | Create with end date before start | `start_date` 2026-12-10, `end_date` 2026-12-01 | 400 | 400 "end_date cannot be before start_date" | Pass |
| API-8 | Create with unknown game | `game_id: 999` | 404 | 404 "Game not found or inactive" | Pass |
| API-9 | List filter by status | `GET /api/tournaments?status=upcoming` | 200, only upcoming | 200, both upcoming tournaments returned | Pass |
| API-10 | List filter by game | `GET /api/tournaments?game_id=3` | 200, only game 3 | 200, only Autumn Chess Cup (game 3) returned | Pass |
| API-11 | List with invalid status | `GET /api/tournaments?status=bogus` | 400 | 400 "Invalid status" | Pass |
| API-12 | Join as player | `POST /api/tournaments/1/join` as alice | 201 | 201 `registered: true` | Pass |
| API-13 | Join the same tournament twice | repeat API-12 | 409 | 409 `Already registered` | Pass |
| API-14 | Join an unknown tournament | `POST /api/tournaments/9999/join` | 404 | 404 `Tournament not found` | Pass |
| API-15 | Join with a non-numeric id | `POST /api/tournaments/abc/join` | 400 | 400 `Invalid tournament id` | Pass |
| API-16 | Join as admin | `POST /api/tournaments/1/join` as rachel | 403 | 403 `Forbidden` | Pass |
| API-17 | Join with no login | no cookie | 401 | 401 `Unauthorized` | Pass |
| API-18 | Join a tournament that is not upcoming | set status to `ongoing`, then join as bob | 409 | 409 "Registration is closed: tournament is ongoing" | Pass |

## 3. UI tests (page `/tournaments`)

| ID | Test | Expected | Actual | Result |
|---|---|---|---|---|
| UI-1 | Tournaments link in navbar for a logged-in player | Link visible between Leaderboard and Dashboard | Visible: Leaderboard, Tournaments, Dashboard | Pass |
| UI-2 | Join button on an upcoming tournament, player already registered | Server message shown | Red message "Already registered" shown | Pass |
| UI-3 | Tournaments link logged out | Link visible | Tournaments link visible; list shown; Create form hidden; note "Log in as a player to join a tournament." shown | Pass |
| UI-4 | Create form visible only to admin/staff | Form shown for admin, hidden for player | Admin (rachel): Create form visible. Player (alice99): Create form hidden, Join button shown on both upcoming tournaments | Pass |
| UI-5 | Successful join shows green message and participant count increases | Green message; count +1 | Players count 0 before; as bob_gg clicked Join on Staff Cup; green message "You joined the tournament."; Players count 1; DB shows one row, player_id 3 | Pass |