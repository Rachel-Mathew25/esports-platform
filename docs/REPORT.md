# Competitive Esports Matchmaking & ELO Leaderboard Platform

DBMS Level 3 project, Team 22, PES University.
Team: Rachel Mathew (PES2UG24CS390), Purvitha Machireddy (PES2UG24CS384)

## 1. Objectives

- Build a platform where players queue for a game, are paired with opponents of similar skill, and have their ELO rating updated after each match.
- Keep all rating logic inside the database (stored procedure and triggers) so ratings stay consistent no matter which client calls it.
- Store high-volume, variable-shaped in-game events (kills, headshots, weapons) in a NoSQL database and aggregate them into player statistics.
- Provide a web application with backend authentication and role-based access (admin, staff, player).

## 2. Functional requirements

| Area | Requirement |
|---|---|
| Accounts | Register and log in. Registering creates the user and the player profile in one transaction. Three roles: admin, staff, player. |
| Queue | A player joins a game queue (one waiting entry per game) and can leave it. |
| Matchmaking | Admin and staff run matchmaking. Waiting players within an ELO range are grouped into balanced teams. Each run is a single transaction. |
| Settling | Admin and staff settle a match with winning team 1, 2 or a draw. ELO, win/loss counts and ELO history update automatically. |
| Leaderboard | Public leaderboard per game with region filter. Logged-in users can search players by name (full-text). |
| Dashboard | A player sees their ratings, ELO history and queue status. |
| Events | Admin and staff record in-game events (stored in MongoDB). Kills analytics aggregate them per player. |
| Tournaments | Create, list and join tournaments (implemented by Purvitha, see docs/PURVITHA_TASKS.md). |

Non-functional: credentials come from environment variables, passwords are hashed, sessions use JWT in an httpOnly cookie, and data rules are enforced in the database (CHECK, UNIQUE and foreign key constraints).

## 3. ER diagram

~~~mermaid
erDiagram
    users ||--o| players : "is"
    users ||--o{ tournaments : "creates"
    games ||--o{ tournaments : "hosts"
    games ||--o{ matches : "played in"
    tournaments ||--o{ matches : "contains"
    players ||--o{ player_game_stats : "has"
    games ||--o{ player_game_stats : "rated in"
    players ||--o{ matchmaking_queue : "waits in"
    games ||--o{ matchmaking_queue : "queue for"
    matches ||--o{ match_players : "has"
    players ||--o{ match_players : "plays"
    players ||--o{ elo_history : "has"
    games ||--o{ elo_history : "for"
    matches ||--o{ elo_history : "caused by"
    tournaments ||--o{ tournament_participants : "has"
    players ||--o{ tournament_participants : "joins"
~~~

Notes on the model:

- players.player_id is also the primary key of the matching users row (one-to-one, shared key). Admin and staff have a users row but no players row.
- player_game_stats, match_players and tournament_participants are junction tables that carry their own attributes (ELO, kills and deaths, seed).
- MongoDB holds the match_events collection, which refers to MySQL match and player ids.

## 4. Relational schema

Ten tables and one view. Primary keys are underlined in the full DDL in db/mysql/schema.sql. The foreign keys, read from information_schema, are:

| Table | Foreign key | References |
|---|---|---|
| players | player_id | users.user_id |
| player_game_stats | player_id | players.player_id |
| player_game_stats | game_id | games.game_id |
| matchmaking_queue | player_id | players.player_id |
| matchmaking_queue | game_id | games.game_id |
| matches | game_id | games.game_id |
| matches | tournament_id | tournaments.tournament_id |
| match_players | match_id | matches.match_id |
| match_players | player_id | players.player_id |
| elo_history | player_id | players.player_id |
| elo_history | game_id | games.game_id |
| elo_history | match_id | matches.match_id |
| tournaments | game_id | games.game_id |
| tournaments | created_by | users.user_id |
| tournament_participants | tournament_id | tournaments.tournament_id |
| tournament_participants | player_id | players.player_id |

Composite primary keys: player_game_stats (player_id, game_id), match_players (match_id, player_id).

Constraints enforced by the database:

- CHECK elo_rating >= 0 on player_game_stats.
- CHECK team_number IN (1, 2) on match_players.
- CHECK ended_at >= started_at on matches.
- ENUMs for role, match status, match type, queue status and tournament status.
- UNIQUE username and email on users.
- uq_queue_one_waiting: a generated column active_slot (1 for waiting rows, NULL otherwise) in a unique key with player_id and game_id, so a player can wait in a game queue only once while finished rows never block new ones.
- FULLTEXT index idx_players_search on players.display_name.

## 5. Database choice and justification

MySQL stores everything relational and transactional: accounts, ratings, queues, matches and tournaments. These need foreign keys, constraints and ACID transactions. Settling a match must update a match, several players and a history table atomically or not at all.

MongoDB stores match events (kill, death, assist, with weapon and free-form metadata). They are append-heavy, and different games record different fields, so a schemaless document fits better than adding nullable columns to a relational table. Aggregation pipelines compute per-player kills and headshot percentage directly in the database.

The API combines both: the kills analytics route runs a MongoDB aggregation and joins the display names from MySQL.

## 6. Data dictionary

PK = primary key, FK = foreign key, UQ = unique. Null column: Y means the column accepts NULL. Full DDL is in db/mysql/schema.sql.

### users

| Column | Type | Null | Notes |
|---|---|---|---|
| user_id | int | N | PK, auto-increment |
| username | varchar(30) | N | UQ |
| email | varchar(100) | N | UQ |
| password_hash | varchar(255) | N | Hashed password, never the plain text |
| role | enum('admin','staff','player') | N | Drives access control |
| created_at | timestamp | Y | |
| is_active | tinyint(1) | Y | |
| last_login | timestamp | Y | Added by alter_auth.sql |

### games

| Column | Type | Null | Notes |
|---|---|---|---|
| game_id | int | N | PK |
| title | varchar(60) | N | UQ |
| genre | varchar(40) | Y | |
| team_size | tinyint | N | Players per team (5 for Valorant and CS2, 1 for Chess.io) |
| is_active | tinyint(1) | Y | |

### players

| Column | Type | Null | Notes |
|---|---|---|---|
| player_id | int | N | PK and FK to users.user_id (shared key, no auto-increment) |
| display_name | varchar(40) | N | FULLTEXT index idx_players_search |
| region | varchar(30) | N | |
| country | varchar(50) | Y | |
| date_joined | date | Y | |

### player_game_stats

| Column | Type | Null | Notes |
|---|---|---|---|
| player_id | int | N | PK part, FK to players |
| game_id | int | N | PK part, FK to games |
| elo_rating | int | N | Default 1000, CHECK elo_rating >= 0 |
| rank_tier | varchar(20) | Y | Bronze, Silver, Gold, Platinum |
| matches_played | int | N | |
| wins | int | N | |
| losses | int | N | |
| draws | int | N | |
| last_played_at | timestamp | Y | |

### matchmaking_queue

| Column | Type | Null | Notes |
|---|---|---|---|
| queue_id | int | N | PK, auto-increment |
| player_id | int | N | FK to players |
| game_id | int | N | FK to games |
| queued_at | timestamp | Y | Defaults to the current time |
| status | enum('waiting','matched','cancelled') | Y | Defaults to waiting |
| active_slot | tinyint | Y | Generated: 1 when status is waiting, otherwise NULL. Part of unique key uq_queue_one_waiting |

### tournaments

| Column | Type | Null | Notes |
|---|---|---|---|
| tournament_id | int | N | PK |
| game_id | int | N | FK to games |
| name | varchar(100) | N | |
| start_date | date | N | |
| end_date | date | Y | |
| status | enum('upcoming','ongoing','completed','cancelled') | Y | |
| created_by | int | N | FK to users |

### tournament_participants

| Column | Type | Null | Notes |
|---|---|---|---|
| tournament_id | int | N | PK part, FK to tournaments |
| player_id | int | N | PK part, FK to players |
| seed | int | Y | |
| registered_at | timestamp | Y | |

### matches

| Column | Type | Null | Notes |
|---|---|---|---|
| match_id | int | N | PK |
| game_id | int | N | FK to games |
| tournament_id | int | Y | FK to tournaments (NULL for non-tournament matches) |
| match_type | enum('ranked','casual','tournament') | Y | |
| status | enum('scheduled','in_progress','completed','cancelled') | Y | |
| started_at | timestamp | Y | |
| ended_at | timestamp | Y | CHECK ended_at >= started_at |
| winning_team | tinyint | Y | 1 or 2, NULL for a draw or an unsettled match |

### match_players

| Column | Type | Null | Notes |
|---|---|---|---|
| match_id | int | N | PK part, FK to matches |
| player_id | int | N | PK part, FK to players |
| team_number | tinyint | N | CHECK team_number IN (1, 2) |
| kills | int | Y | |
| deaths | int | Y | |
| assists | int | Y | |
| elo_before | int | N | Rating when the match was created |
| elo_after | int | Y | Set when the match is settled. Setting it fires the stats trigger |

### elo_history

| Column | Type | Null | Notes |
|---|---|---|---|
| history_id | bigint | N | PK |
| player_id | int | N | FK to players |
| game_id | int | N | FK to games |
| match_id | int | N | FK to matches |
| old_elo | int | N | |
| new_elo | int | N | |
| elo_change | int | Y | Generated column: new_elo minus old_elo. Never inserted directly |
| recorded_at | timestamp | Y | |

### v_leaderboard (view)

Columns: game_title, player_id, display_name, region, elo_rating, rank_tier, wins, losses, matches_played, leaderboard_rank. The rank is computed per game, ordered by ELO.

### MongoDB: match_events (database esports_logs)

| Field | Type | Notes |
|---|---|---|
| match_id | number | Refers to matches.match_id in MySQL |
| player_id | number | Refers to players.player_id in MySQL |
| type | string | kill, death or assist |
| weapon | string | Optional |
| meta | object | Free-form, for example headshot and round |
| timestamp | date | When the event was recorded |

## 7. Implementation

### 7.1 Database objects

| Object | Purpose |
|---|---|
| Trigger trg_queue_before_insert | Before a queue row is inserted, creates a default player_game_stats row (1000 ELO) if the player has none for that game. |
| Trigger trg_match_players_after_update | When match_players.elo_after changes from NULL to a value, updates player_game_stats (rating, matches played, wins, losses, draws from matches.winning_team) and inserts a row into elo_history. |
| Stored procedure sp_settle_match | Settles a match with ELO K=32 using team-average ratings. Details below. |
| Trigger trg_tp_before_insert | Before a tournament_participants row is inserted, rejects the insert if the tournament already has 16 participants. |
| Stored procedure sp_seed_tournament | Assigns seeds 1..n to a tournament's participants by ELO rank. Details below. |
| View v_leaderboard | Per-game ranking used by the public leaderboard. |
| FULLTEXT index idx_players_search | Powers player search in BOOLEAN MODE. |
| Unique key uq_queue_one_waiting | One waiting queue entry per player and game (see 7.4). |

sp_settle_match (p_match_id, p_winning_team):

- Runs in a transaction with an exit handler that rolls back and re-raises the error.
- Locks the match with SELECT ... FOR UPDATE, so two settle requests cannot both pass.
- Accepts winning team 1, 2 or NULL (draw). Anything else is rejected.
- Raises error 1644 for "Match not found", "Match already settled or cancelled" and "Both teams need at least one player". The API maps these to 404, 409 and 400.
- Updates matches, then sets elo_after for each player. That update fires the trigger, which updates the stats and writes the history rows.
- Ratings are clamped with GREATEST(0, ...) so they never go negative.

sp_seed_tournament (p_tournament_id):

- Raises error 1644 for "Tournament not found", "Tournament is not upcoming" and "At least 2 participants are required". The start route maps these to 404, 409 and 400.
- Ranks the participants with ROW_NUMBER() OVER (ORDER BY ELO DESC, registered_at ASC, player_id ASC) and writes the result into tournament_participants.seed, so seed 1 is the highest ELO.
- ELO comes from player_game_stats for the tournament's game. A player with no stats row counts as 1000.

trg_tp_before_insert counts the existing participants before each insert and raises SQLSTATE 45000 "Tournament is full (maximum 16 participants)" once 16 are registered. The limit is enforced in the database, so it holds even if a request bypasses the API.

### 7.2 API routes

| Route | Access | Purpose |
|---|---|---|
| POST /api/auth/register | public | Creates the users and players rows in one transaction |
| POST /api/auth/login, GET /api/auth/me, POST /api/auth/logout | | Session handling with a JWT in an httpOnly cookie |
| GET /api/health | public | Checks both databases |
| GET /api/leaderboard | public | Reads v_leaderboard, with game, region and limit filters |
| GET /api/players/search | logged in | Full-text search on display names |
| GET /api/stats/by-game | public | Aggregates per game with GROUP BY and HAVING |
| GET /api/games | public | Active games |
| GET /api/players/me | player | Profile, ratings, last 20 ELO changes, waiting queues |
| POST /api/queue/join | player | Joins a game queue |
| POST /api/queue/cancel | player | Leaves a queue (own waiting entries only) |
| POST /api/matchmaking/run | admin, staff | Pairs waiting players in one transaction |
| GET /api/matches | admin, staff | Open matches with both teams |
| POST /api/matches/[id]/settle | admin, staff | Calls sp_settle_match |
| POST /api/matches/[id]/events | admin, staff | Inserts a MongoDB event after checking the match and the player |
| GET /api/analytics/kills | logged in | MongoDB aggregation joined with MySQL names |
| GET /api/tournaments | public | Lists tournaments |
| POST /api/tournaments | admin, staff | Creates a tournament |
| POST /api/tournaments/[id]/join | player | Registers the player in a transaction. The cap trigger rejects the 17th entry (409 "Tournament is full"). A duplicate entry gives 409 "Already registered". |
| POST /api/tournaments/[id]/start | admin, staff | Calls sp_seed_tournament, then sets the status to ongoing. Maps procedure errors to 404, 409 and 400. |
| GET /api/tournaments/mine | player | Returns the ids of tournaments the player has joined |

### 7.3 Pages

| Page | Who | What it does |
|---|---|---|
| / | everyone | Landing page |
| /login, /register | everyone | Call the auth routes. Register logs the user in afterwards |
| /leaderboard | everyone | Game and region filters. Player search for logged-in users |
| /dashboard | player | Ratings, ELO history, join and leave queue |
| /admin | admin, staff | Run matchmaking, settle open matches, record events, kills analytics |
| /tournaments | everyone | Tournament list with filters. Players see Join or Registered. Admin and staff also get a Create form and a Start button |

The navigation bar reads the session from /api/auth/me and shows links by role: Dashboard for players, Admin for admin and staff.

### 7.4 Matchmaking and transactions

POST /api/matchmaking/run works inside one transaction. It selects waiting queue rows with FOR UPDATE, groups players of each game whose ratings are within the ELO range (default 200), splits them into two teams with a snake draft so team strength stays balanced, inserts the match and match_players rows, and marks the queue rows as matched. If anything fails, the whole run rolls back and no half-created match remains. Running it twice does not match the same players twice, because matched rows are no longer waiting.

Register uses the same pattern: the users and players inserts commit together or not at all, so a failed registration leaves no orphan rows.

### 7.5 Security

- Credentials and the JWT secret are read from environment variables (web/.env.local, which is git-ignored). Only web/.env.example with placeholders is committed.
- Every protected route calls requireRole, which checks the cookie and returns 401 (not logged in) or 403 (wrong role).
- Passwords are hashed with bcrypt (bcryptjs, cost factor 10) before they are stored.
- User input is never concatenated into SQL. Values are always passed as bound parameters (? placeholders). The only text inserted into a query is a fixed fragment chosen by the code itself (the optional game filter in matchmaking), and the supplied game_id is still bound as a parameter.
- The database enforces its own rules (CHECK, UNIQUE, foreign keys), so bad data is rejected even if the application has a bug.

### 7.6 A defect found during testing

Matchmaking worked the first time, then returned a 500 for players who had already been matched once. The server log showed a duplicate-key error on the original unique key (player_id, game_id, status): a finished matched row blocked the next match, and the same key would also have blocked a second cancelled row. The fix (db/mysql/alter_queue_index.sql) drops that key and adds a generated column active_slot that is 1 only for waiting rows, with a unique key on (player_id, game_id, active_slot). MySQL allows many NULLs in a unique index, so history rows never collide, while a player still cannot wait twice in the same game queue. After the fix, matchmaking returned 200, match 8 settled correctly (+11 and -11), and a player was able to cancel twice for the same game.

## 8. Important queries

### 8.1 Leaderboard view (JOIN and window function)

~~~sql
CREATE VIEW v_leaderboard AS
SELECT g.title AS game_title, pgs.player_id, p.display_name, p.region,
       pgs.elo_rating, pgs.rank_tier, pgs.wins, pgs.losses, pgs.matches_played,
       RANK() OVER (PARTITION BY pgs.game_id ORDER BY pgs.elo_rating DESC) AS leaderboard_rank
FROM player_game_stats pgs
JOIN players p ON pgs.player_id = p.player_id
JOIN games g   ON pgs.game_id = g.game_id;
~~~

The rank restarts for each game, and players with equal ratings share a rank. GET /api/leaderboard reads this view and applies the game, region and limit filters.

### 8.2 Per-game statistics (GROUP BY and HAVING)

~~~sql
SELECT game_title,
       COUNT(*) AS players,
       ROUND(AVG(elo_rating)) AS avg_elo,
       MAX(elo_rating) AS top_elo,
       SUM(matches_played) AS total_matches
FROM v_leaderboard
GROUP BY game_title
HAVING COUNT(*) >= 1
ORDER BY avg_elo DESC;
~~~

Used by GET /api/stats/by-game. It aggregates over the view, so the view's joins are reused.

### 8.3 Kills analytics (MongoDB aggregation)

~~~js
db.collection("match_events").aggregate([
  { $match: { type: "kill" } },
  { $group: {
      _id: "$player_id",
      kills: { $sum: 1 },
      headshots: { $sum: { $cond: [{ $eq: ["$meta.headshot", true] }, 1, 0] } },
      matches: { $addToSet: "$match_id" } } },
  { $sort: { kills: -1 } },
  { $limit: 10 }
])
~~~

The route then looks up display names in MySQL and computes the headshot percentage:

~~~sql
SELECT player_id, display_name FROM players WHERE player_id IN (?);
~~~

This joins the two databases in the application: MongoDB does the counting over events, MySQL supplies the names. An optional match_id filter is added to the $match stage. The collection has an index on (match_id, timestamp).

### 8.4 Full-text player search

~~~sql
SELECT p.player_id, p.display_name, p.region, g.title AS game, s.elo_rating, s.rank_tier
FROM players p
LEFT JOIN player_game_stats s ON s.player_id = p.player_id
LEFT JOIN games g ON g.game_id = s.game_id
WHERE MATCH(p.display_name) AGAINST (? IN BOOLEAN MODE)
ORDER BY s.elo_rating DESC
LIMIT 20;
~~~

Used by GET /api/players/search. The search text is cleaned first: every character that is not a letter, digit or space is removed, then each word becomes a required prefix term. For example, "ali str" becomes "+ali* +str*". This stops users from injecting boolean operators into the full-text query, and prefix matching finds AliceStrikes from "ali". The value is passed as a bound parameter. Matching uses the FULLTEXT index idx_players_search, and the LEFT JOINs keep players who have no rating yet.

### 8.5 Matchmaking queue selection (locking read)

~~~sql
SELECT q.queue_id, q.player_id, q.game_id, g.title, g.team_size,
       COALESCE(s.elo_rating, 1000) AS elo
FROM matchmaking_queue q
JOIN games g ON g.game_id = q.game_id AND g.is_active = 1
LEFT JOIN player_game_stats s ON s.player_id = q.player_id AND s.game_id = q.game_id
WHERE q.status = 'waiting'   -- plus an optional game filter
ORDER BY q.game_id, elo DESC, q.queued_at
FOR UPDATE OF q;
~~~

Used by POST /api/matchmaking/run inside its transaction. FOR UPDATE OF q locks only the queue rows, so two matchmaking runs cannot pick the same players. COALESCE gives unrated players the default rating of 1000. The application then groups the rows by game, forms matches of team_size x 2 players whose ratings are within the ELO range, and splits each match into two teams with a snake draft.

### 8.6 ELO calculation (inside sp_settle_match)

~~~sql
SET v_expected1 = 1 / (1 + POWER(10, (v_team2_avg - v_team1_avg) / 400));
SET v_expected2 = 1 / (1 + POWER(10, (v_team1_avg - v_team2_avg) / 400));

-- score: 1 for a win, 0 for a loss, 0.5 each for a draw
UPDATE matches
SET status = 'completed', winning_team = p_winning_team, ended_at = NOW()
WHERE match_id = p_match_id;

UPDATE match_players
SET elo_after = GREATEST(0, elo_before + ROUND(v_k * (v_score1 - v_expected1)))
WHERE match_id = p_match_id AND team_number = 1;
~~~

The expected score is the standard ELO formula, computed from the two teams' average ratings. A player's new rating is the old rating plus K times (actual score minus expected score), with K = 32. The matches row is updated first so that the trigger, which fires when elo_after is set, sees the real winning_team. The second UPDATE (team 2) is identical with v_score2 and v_expected2.

Worked example from match 8 (Chess.io, a 1v1): Alice 1437 against Bob 1333. Alice's expected score is about 0.65, so when she wins she gains about 32 x (1 - 0.65) = 11 points and Bob loses the same, which matches the +11 and -11 stored in elo_history.

### 8.7 Tournament seeding (inside sp_seed_tournament)

~~~sql
UPDATE tournament_participants tp
JOIN (
  SELECT tp2.player_id,
         ROW_NUMBER() OVER (
           ORDER BY COALESCE(pgs.elo_rating, 1000) DESC,
                    tp2.registered_at ASC,
                    tp2.player_id ASC
         ) AS rn
    FROM tournament_participants tp2
    JOIN tournaments t ON t.tournament_id = tp2.tournament_id
    LEFT JOIN player_game_stats pgs
           ON pgs.player_id = tp2.player_id AND pgs.game_id = t.game_id
   WHERE tp2.tournament_id = p_tournament_id
) r ON r.player_id = tp.player_id
SET tp.seed = r.rn
WHERE tp.tournament_id = p_tournament_id;
~~~

The subquery ranks the tournament's participants with the window function ROW_NUMBER(). The highest ELO in the tournament's game gets rn = 1. The LEFT JOIN to player_game_stats means a player with no stats row still appears, and COALESCE treats the missing rating as 1000. Ties are broken by earlier registration and then by player_id, so every player gets a distinct seed. The outer UPDATE joins the ranking back to tournament_participants and writes rn into the seed column in a single statement.

Worked example from the test in 10.10: Alice (1280) gets seed 1 and Bob (1190) gets seed 2. Rolling back the test sets both seeds back to NULL.

## 9. Architecture

The application is a single Next.js project. React pages run in the browser and call API routes (route handlers) in the same project. The routes talk to the two databases.

~~~mermaid
flowchart LR
    B["Browser: React pages<br/>login, leaderboard, dashboard, admin"]
    A["Next.js API routes<br/>app/api/*"]
    L["lib/auth.js<br/>JWT cookie, requireRole"]
    M[("MySQL esports_platform<br/>tables, view, triggers, procedure")]
    G[("MongoDB esports_logs<br/>match_events")]
    B -->|"fetch, cookie sent automatically"| A
    A --> L
    A -->|"SQL, transactions"| M
    A -->|"insert, aggregate"| G
~~~

### 9.1 Layers

| Layer | Where | Responsibility |
|---|---|---|
| Presentation | web/app/*/page.js, web/components/Nav.js | Pages and the role-aware navigation bar. They hold no business rules and only call the API. |
| API | web/app/api/**/route.js | Validates input, checks the session and role, runs the SQL or MongoDB operation, maps errors to HTTP status codes. |
| Shared helpers | web/lib/mysql.js, mongo.js, auth.js | MySQL connection pool, MongoDB connection, session and role checks. |
| Data (relational) | MySQL | Constraints, triggers and the settle procedure enforce the rules and keep ratings consistent. |
| Data (documents) | MongoDB | Stores in-game events and runs the kills aggregation. |

### 9.2 Authentication and roles

1. POST /api/auth/login checks the email and the bcrypt hash, then signs a JWT carrying the user id, username and role.
2. The token is stored in an httpOnly cookie named token, so page scripts cannot read it. The browser sends it with every request.
3. Protected routes call requireRole(request, [roles]). It returns 401 when there is no valid session and 403 when the role is not allowed.
4. The navigation bar asks GET /api/auth/me who is logged in and shows Dashboard to players and Admin to admin and staff. Pages such as /admin and /dashboard also check the response and show a message or redirect, but the API routes are the real enforcement.

| Role | Can do |
|---|---|
| player | Join and leave queues, view own dashboard, leaderboard, search, kills analytics |
| staff and admin | Everything a visitor can see, plus run matchmaking, settle matches, record events, list open matches |

### 9.3 Example request flow: settling a match

1. The admin clicks "Team 1 wins" on /admin. The page sends POST /api/matches/8/settle with { "winning_team": 1 }.
2. The route checks the cookie and the admin or staff role, then validates the match id and winning team.
3. The route calls sp_settle_match(8, 1). Inside one transaction the procedure locks the match, computes the new ratings and updates match_players.
4. The update of elo_after fires trg_match_players_after_update, which updates player_game_stats and inserts the elo_history rows.
5. The route returns 200 and the page reloads the open-matches list. Procedure errors become 404 (not found), 409 (already settled) or 400 (invalid input).

### 9.4 Configuration

All connection details and the signing secret come from environment variables in web/.env.local, which is not committed: MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE, MONGODB_URI, MONGODB_DB and JWT_SECRET. web/.env.example lists the names with empty values.

### 9.5 Error handling

Routes return specific 4xx codes for bad input and permission problems. Unexpected failures are logged on the server and returned to the client as a generic "Internal server error", so database details are not exposed. Multi-step writes (register, matchmaking, settle) run in transactions and roll back on failure.

## 10. Testing results

All tests below were run against the local MySQL and MongoDB databases with the dev server running. API tests used curl with cookies saved from real logins (admin, staff and player accounts). Each row records the behaviour that was actually observed. The full test-case file is in tests/test_cases.md.

### 10.1 Authentication and roles

| Test | Expected | Observed |
|---|---|---|
| Register with an existing username or email | 409, no orphan rows | 409, no rows left in users or players |
| Register with a short password or bad email | 400 | 400 |
| Player calls an admin route | 403 | 403 |
| Any protected route with no cookie | 401 | 401 |
| Staff calls matchmaking | 200 | 200 (matches_created 0 when nobody waiting) |
| Staff calls players/me or queue join | 403 | 403 |

### 10.2 Queue

| Test | Expected | Observed |
|---|---|---|
| Join the same game twice | 409 | 409 |
| Join an unknown game | 404 | 404 |
| Join with no game_id | 400 | 400 |
| Admin joins a queue | 403 | 403 |
| Cancel another player's entry | 404 | 404 |
| Cancel own waiting entry | 200 | 200 |
| Cancel the same entry again | 404 | 404 |
| Cancel with an empty body | 400 | 400 |
| Cancel with no cookie | 401 | 401 |

### 10.3 Matchmaking

| Test | Expected | Observed |
|---|---|---|
| elo_range 100 with ratings 1460 and 1310 | no match | 0 matches created |
| Default range (200) with two close players | one match | match created |
| Run matchmaking a second time | nothing new | 0 matches created |
| elo_range of -5 | 400 | 400 |
| Player calls matchmaking | 403 | 403 |

### 10.4 Settling matches and ELO

| Test | Expected | Observed |
|---|---|---|
| Settle an open match | ELO updated by trigger | player_game_stats updated |
| elo_history after a settle | two equal and opposite rows | match 8: Alice +11, Bob -11 |
| Settle the same match again | 409 | 409 |
| Settle a missing match | 404 | 404 |
| Hand check of ELO maths | about +11 | Alice 1437 vs Bob 1333: expected score 0.645, 32 x (1 - 0.645) = 11.4, stored +11 |

### 10.5 MongoDB events and analytics

| Test | Expected | Observed |
|---|---|---|
| Post an event with no cookie | 401 | 401 |
| Post an event as admin | 201 | 201 |
| Event for a player not in the match | 400 | 400 |
| Event with a bad type | 400 | 400 |
| Event for a missing match | 404 | 404 |
| Event as a player | 403 | 403 |
| Kills analytics with no cookie | 401 | 401 |
| Kills analytics as admin | aggregated kills | BobFrag 3 kills (2 headshots, 67%), DanDagger 1 kill (100%) |
| Kills analytics with limit=0 | 400 | 400 |

### 10.6 Player profile

| Test | Expected | Observed |
|---|---|---|
| players/me with no cookie | 401 | 401 |
| players/me as admin | 403 | 403 |
| players/me as Alice | 200 with stats, history, waiting_in | 200 with all three |

### 10.7 Defects found and fixed during testing

1. **Queue unique key.** The original key uq_queue_active (player_id, game_id, status) blocked a player from being matched twice. Running matchmaking for already-matched players returned 500 with a duplicate-entry error on the key. It was replaced with a generated column active_slot and the unique key uq_queue_one_waiting (player_id, game_id, active_slot), which only constrains waiting rows (db/mysql/alter_queue_index.sql). After the fix a new match (match 8) was created and settled correctly.
2. **Wrong import.** One route imported pool as a default export, which returned 500. It now uses the named import.
3. **Rollbacks.** Failed register and matchmaking transactions left no partial rows. Match ids 4 to 7 were skipped by auto-increment after rolled-back transactions, which is harmless.
4. **Error leakage.** Several routes returned err.message to the client. They now return a generic 500 and log the real error on the server. Only the settle route still reads the database message, on purpose, to map procedure errors to 404, 409 and 400.

### 10.8 Security audit

- A search of app/api and lib for template-string SQL found three matches. One builds a boolean search string that is passed as a bound parameter, one builds an error message from a constant list, and one inserts a fixed fragment (AND q.game_id = ?) whose value is bound. No user input reaches SQL text.
- A search for err.message in app/api shows only the settle route.

### 10.9 Setup test

full_dump.sql was loaded into an empty scratch database. It produced 10 tables and one view, 7 users, 8 leaderboard rows, 3 triggers (trg_match_players_after_update, trg_queue_before_insert, trg_tp_before_insert) and 2 stored procedures (sp_settle_match, sp_seed_tournament). The dump was regenerated after the tournament changes were merged.

### 10.10 Tournaments

These tests were written and run by Purvitha Machireddy against her copy of the database (full list with commands in tests/test_cases.md). The tournament create form, join, and start-with-one-player checks were also repeated in the browser on the merged code with a test tournament, and behaved as below.

| Test | Expected | Observed |
|---|---|---|
| Duplicate registration (DB-4) | duplicate key error | ERROR 1062 on the primary key (tournament_id, player_id) |
| Delete a tournament that has matches (DB-5) | matches.tournament_id set to NULL | value changed from 2 to NULL (ON DELETE SET NULL) |
| Failed insert inside a transaction (DB-6) | whole transaction rolled back | ERROR 1048 on NULL display_name, no leftover user |
| Cap trigger trg_tp_before_insert (DB-7) | 16 allowed, 17th rejected | count reached 16, 17th rejected with ERROR 1644 (SQLSTATE 45000) Tournament is full |
| Seeding with sp_seed_tournament (DB-8) | higher ELO gets seed 1 | Alice (1280) seed 1, Bob (1190) seed 2, seeds NULL again after rollback |
| Join as admin (API-16) | 403 | 403 Forbidden |
| Join with no login (API-17) | 401 | 401 Unauthorized |
| Join a tournament that is not upcoming (API-18) | 409 | 409 Registration is closed |
| Join a full tournament (API-19) | 409 | 409 Tournament is full |
| Start as a player (API-20) | 403 | 403 Forbidden |
| Start with fewer than 2 participants (API-21) | 409 | 409 At least 2 participants are required |
| Start with 2 participants (API-22) | 200, ongoing, seeded by ELO | 200, status ongoing, Alice seed 1, Bob seed 2 |
| My tournaments (API-23) | 200 with a list of ids | 200 with [1] |
| Create form visibility (UI-4) | only admin and staff see it | visible for admin, hidden for a player, who sees Join or Registered |

The cap is enforced in the database by the trigger, and the join route maps the trigger error to a 409 response, so the rule holds even if the API is bypassed.
