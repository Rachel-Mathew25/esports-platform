DROP TRIGGER IF EXISTS trg_queue_before_insert;
DROP TRIGGER IF EXISTS trg_match_players_after_update;
DROP PROCEDURE IF EXISTS sp_settle_match;

DELIMITER //

CREATE TRIGGER trg_queue_before_insert
BEFORE INSERT ON matchmaking_queue
FOR EACH ROW
BEGIN
    INSERT INTO player_game_stats (player_id, game_id)
    SELECT NEW.player_id, NEW.game_id
    WHERE NOT EXISTS (
        SELECT 1 FROM player_game_stats
        WHERE player_id = NEW.player_id AND game_id = NEW.game_id
    );
END //

CREATE TRIGGER trg_match_players_after_update
AFTER UPDATE ON match_players
FOR EACH ROW
BEGIN
    IF NEW.elo_after IS NOT NULL AND OLD.elo_after IS NULL THEN
        UPDATE player_game_stats s
        JOIN matches m ON m.match_id = NEW.match_id
        SET s.elo_rating     = NEW.elo_after,
            s.matches_played = s.matches_played + 1,
            s.wins   = s.wins   + IF(m.winning_team = NEW.team_number, 1, 0),
            s.losses = s.losses + IF(m.winning_team IS NOT NULL AND m.winning_team <> NEW.team_number, 1, 0),
            s.draws  = s.draws  + IF(m.winning_team IS NULL, 1, 0),
            s.last_played_at = NOW()
        WHERE s.player_id = NEW.player_id AND s.game_id = m.game_id;

        INSERT INTO elo_history (player_id, game_id, match_id, old_elo, new_elo)
        SELECT NEW.player_id, m.game_id, NEW.match_id, NEW.elo_before, NEW.elo_after
        FROM matches m WHERE m.match_id = NEW.match_id;
    END IF;
END //

CREATE PROCEDURE sp_settle_match(IN p_match_id INT, IN p_winning_team TINYINT)
BEGIN
    DECLARE v_k INT DEFAULT 32;
    DECLARE v_status VARCHAR(20);
    DECLARE v_team1_avg DECIMAL(10,2);
    DECLARE v_team2_avg DECIMAL(10,2);
    DECLARE v_expected1 DECIMAL(10,4);
    DECLARE v_expected2 DECIMAL(10,4);
    DECLARE v_score1 DECIMAL(3,2);
    DECLARE v_score2 DECIMAL(3,2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_winning_team IS NOT NULL AND p_winning_team NOT IN (1, 2) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'winning_team must be 1, 2 or NULL (draw)';
    END IF;

    START TRANSACTION;

    SELECT status INTO v_status FROM matches WHERE match_id = p_match_id FOR UPDATE;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Match not found';
    END IF;
    IF v_status IN ('completed', 'cancelled') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Match already settled or cancelled';
    END IF;

    SELECT AVG(elo_before) INTO v_team1_avg FROM match_players WHERE match_id = p_match_id AND team_number = 1;
    SELECT AVG(elo_before) INTO v_team2_avg FROM match_players WHERE match_id = p_match_id AND team_number = 2;

    IF v_team1_avg IS NULL OR v_team2_avg IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Both teams need at least one player';
    END IF;

    SET v_expected1 = 1 / (1 + POWER(10, (v_team2_avg - v_team1_avg) / 400));
    SET v_expected2 = 1 / (1 + POWER(10, (v_team1_avg - v_team2_avg) / 400));

    IF p_winning_team = 1 THEN
        SET v_score1 = 1, v_score2 = 0;
    ELSEIF p_winning_team = 2 THEN
        SET v_score1 = 0, v_score2 = 1;
    ELSE
        SET v_score1 = 0.5, v_score2 = 0.5;
    END IF;

    -- matches first, so the trigger sees the real winning_team
    UPDATE matches
    SET status = 'completed', winning_team = p_winning_team, ended_at = NOW()
    WHERE match_id = p_match_id;

    UPDATE match_players
    SET elo_after = GREATEST(0, elo_before + ROUND(v_k * (v_score1 - v_expected1)))
    WHERE match_id = p_match_id AND team_number = 1;

    UPDATE match_players
    SET elo_after = GREATEST(0, elo_before + ROUND(v_k * (v_score2 - v_expected2)))
    WHERE match_id = p_match_id AND team_number = 2;

    COMMIT;
END //

DELIMITER ;
