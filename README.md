# Competitive Esports Matchmaking & ELO Leaderboard Platform

DBMS Level 3 project, Team 22, PES University.

Team: Rachel Mathew (PES2UG24CS390), Purvitha Machireddy (PES2UG24CS384)

## What it does

Players register, join a matchmaking queue for a game, get paired with players of similar skill, and watch their ELO rating change after every match. Admin and staff accounts run matchmaking, settle matches and record in-game events.

- Matchmaking runs in a single transaction and builds balanced teams with a snake draft.
- Settling a match calls a stored procedure (ELO, K=32). Triggers update player stats and write ELO history.
- The leaderboard is a database view, and player search uses a full-text index.
- In-game events (kills, headshots) are stored in MongoDB and aggregated into live stats.
- Login uses JWT in an httpOnly cookie, with three roles: admin, staff and player.

## Tech stack

- Next.js 16 (App Router, JavaScript)
- MySQL 8 for relational and transactional data
- MongoDB for variable-shaped, append-heavy event logs

## Prerequisites

Node.js 20 or newer, MySQL 8, MongoDB running locally, and mongosh.

## Setup

### 1. Clone

    git clone https://github.com/Rachel-Mathew25/esports-platform.git
    cd esports-platform

### 2. MySQL

Create the database, then load the full dump (tables, view, triggers, stored procedure and demo data). The dump does not create the database itself.

    mysql -u root -p -e "CREATE DATABASE esports_platform"
    mysql -u root -p esports_platform < db/mysql/full_dump.sql

### 3. MongoDB

This drops and reloads the match_events collection in the esports_logs database.

    mongosh < db/mongo/setup.js

### 4. Environment variables

    cd web
    cp .env.example .env.local

Open .env.local and fill in MYSQL_USER, MYSQL_PASSWORD (in double quotes) and JWT_SECRET. A random secret can be generated with:

    openssl rand -hex 32

### 5. Run

    npm install
    npm run dev

Open http://localhost:3000. Restart the dev server after changing .env.local.

## Demo accounts

All demo accounts use the password password123.

| Email | Role |
|---|---|
| rachel@test.com | admin |
| sam@esports.com | staff |
| alice@esports.com | player |
| bob@esports.com | player |
| carla@esports.com | player |
| dan@esports.com | player |
| erin@esports.com | player |

Admin and staff accounts have no player profile, so they cannot join queues and have no dashboard.

## Project layout

    db/mysql/    schema.sql (structure), full_dump.sql (structure and data),
                 routines.sql (triggers and procedure), seed.sql (demo data),
                 alter_*.sql (migrations, already included in the dumps),
                 tournaments.sql (participant cap trigger, ELO seeding procedure)
    db/mongo/    setup.js (collection, seed events, aggregation)
    web/         Next.js app: pages in app/, API routes in app/api/, helpers in lib/
    docs/        project report
    tests/       test cases

## Documentation

The full report (ER diagram, schema, queries, architecture, testing) is in docs/REPORT.md.
