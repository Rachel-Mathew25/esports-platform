USE esports_platform;

ALTER TABLE matchmaking_queue
  DROP INDEX uq_queue_active,
  ADD COLUMN active_slot TINYINT GENERATED ALWAYS AS (IF(status = 'waiting', 1, NULL)) VIRTUAL,
  ADD UNIQUE KEY uq_queue_one_waiting (player_id, game_id, active_slot);
