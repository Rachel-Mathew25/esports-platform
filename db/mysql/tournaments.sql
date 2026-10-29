-- Tournament extras: participant cap trigger and ELO seeding procedure.
-- Safe to re-run: each object is dropped first.
USE esports_platform;

DROP TRIGGER IF EXISTS trg_tp_before_insert;
DROP PROCEDURE IF EXISTS sp_seed_tournament;

DELIMITER $$

CREATE TRIGGER trg_tp_before_insert
BEFORE INSERT ON tournament_participants
FOR EACH ROW
BEGIN
  DECLARE current_count INT;
  SELECT COUNT(*) INTO current_count
    FROM tournament_participants
   WHERE tournament_id = NEW.tournament_id;
  IF current_count >= 16 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Tournament is full (maximum 16 participants)';
  END IF;
END$$

CREATE PROCEDURE sp_seed_tournament(IN p_tournament_id INT)
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE v_count INT;

  SELECT status INTO v_status
    FROM tournaments
   WHERE tournament_id = p_tournament_id;

  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tournament not found';
  END IF;
  IF v_status <> 'upcoming' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tournament is not upcoming';
  END IF;

  SELECT COUNT(*) INTO v_count
    FROM tournament_participants
   WHERE tournament_id = p_tournament_id;
  IF v_count < 2 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'At least 2 participants are required';
  END IF;

  -- Seed 1 = highest ELO in the tournament's game (missing stats count as 1000).
  -- Ties are broken by earlier registration, then by player_id.
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
END$$

DELIMITER ;