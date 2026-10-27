INSERT INTO users (user_id, username, email, password_hash, role) VALUES
(2, 'alice99', 'alice@esports.com', '$2b$10$KSJlh6WG6uL71OvhogS28O9Yd00KBxlYLAC.JPH/0KZjMoyv8xzPG', 'player'),
(3, 'bob_gg',  'bob@esports.com',   '$2b$10$KSJlh6WG6uL71OvhogS28O9Yd00KBxlYLAC.JPH/0KZjMoyv8xzPG', 'player'),
(4, 'carla_x', 'carla@esports.com', '$2b$10$KSJlh6WG6uL71OvhogS28O9Yd00KBxlYLAC.JPH/0KZjMoyv8xzPG', 'player'),
(5, 'dev_dan', 'dan@esports.com',   '$2b$10$KSJlh6WG6uL71OvhogS28O9Yd00KBxlYLAC.JPH/0KZjMoyv8xzPG', 'player'),
(6, 'mod_sam', 'sam@esports.com',   '$2b$10$KSJlh6WG6uL71OvhogS28O9Yd00KBxlYLAC.JPH/0KZjMoyv8xzPG', 'staff');

INSERT INTO players (player_id, display_name, region, country) VALUES
(2, 'AliceStrikes', 'APAC', 'India'),
(3, 'BobFrag',      'NA',   'USA'),
(4, 'CarlaClutch',  'EU',   'Germany'),
(5, 'DanDagger',    'APAC', 'India');

INSERT INTO games (title, genre, team_size) VALUES
('Valorant', 'Tactical Shooter', 5),
('CS2',      'Tactical Shooter', 5),
('Chess.io', '1v1 Strategy',     1);

INSERT INTO player_game_stats (player_id, game_id, elo_rating, rank_tier, matches_played, wins, losses, draws, last_played_at)
SELECT x.p, g.game_id, x.e, x.t, x.mp, x.w, x.l, 0, NOW() - INTERVAL 2 DAY
FROM games g JOIN (
  SELECT 2 p, 'Chess.io' title, 1450 e, 'Gold' t, 20 mp, 12 w, 8 l
  UNION ALL SELECT 3, 'Chess.io', 1320, 'Silver', 18, 9, 9
  UNION ALL SELECT 4, 'Chess.io', 1385, 'Silver', 15, 8, 7
  UNION ALL SELECT 5, 'Chess.io', 1210, 'Bronze', 12, 5, 7
  UNION ALL SELECT 2, 'Valorant', 1280, 'Silver', 25, 12, 13
  UNION ALL SELECT 3, 'Valorant', 1190, 'Bronze', 22, 10, 12
  UNION ALL SELECT 4, 'Valorant', 1510, 'Platinum', 30, 19, 11
  UNION ALL SELECT 5, 'Valorant', 1105, 'Bronze', 14, 6, 8
) x ON x.title = g.title;

INSERT INTO matches (game_id, match_type, status, started_at)
SELECT game_id, 'ranked', 'in_progress', NOW() - INTERVAL 1 HOUR FROM games WHERE title = 'Chess.io';
SET @m1 = LAST_INSERT_ID();
INSERT INTO match_players (match_id, player_id, team_number, elo_before) VALUES (@m1, 2, 1, 1450), (@m1, 3, 2, 1320);

INSERT INTO matches (game_id, match_type, status, started_at)
SELECT game_id, 'ranked', 'in_progress', NOW() - INTERVAL 30 MINUTE FROM games WHERE title = 'Chess.io';
SET @m2 = LAST_INSERT_ID();
INSERT INTO match_players (match_id, player_id, team_number, elo_before) VALUES (@m2, 4, 1, 1385), (@m2, 5, 2, 1210);
