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
