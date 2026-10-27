-- MySQL dump 10.13  Distrib 8.0.46, for macos15 (arm64)
--
-- Host: localhost    Database: esports_platform
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `elo_history`
--

DROP TABLE IF EXISTS `elo_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `elo_history` (
  `history_id` bigint NOT NULL AUTO_INCREMENT,
  `player_id` int NOT NULL,
  `game_id` int NOT NULL,
  `match_id` int NOT NULL,
  `old_elo` int NOT NULL,
  `new_elo` int NOT NULL,
  `elo_change` int GENERATED ALWAYS AS ((`new_elo` - `old_elo`)) STORED,
  `recorded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`history_id`),
  KEY `fk_eh_game` (`game_id`),
  KEY `fk_eh_match` (`match_id`),
  KEY `idx_elo_history_player` (`player_id`,`game_id`,`recorded_at`),
  CONSTRAINT `fk_eh_game` FOREIGN KEY (`game_id`) REFERENCES `games` (`game_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_eh_match` FOREIGN KEY (`match_id`) REFERENCES `matches` (`match_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_eh_player` FOREIGN KEY (`player_id`) REFERENCES `players` (`player_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `games`
--

DROP TABLE IF EXISTS `games`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `games` (
  `game_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `genre` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `team_size` tinyint NOT NULL DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`game_id`),
  UNIQUE KEY `uq_games_title` (`title`),
  CONSTRAINT `chk_team_size` CHECK ((`team_size` between 1 and 10))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `match_players`
--

DROP TABLE IF EXISTS `match_players`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `match_players` (
  `match_id` int NOT NULL,
  `player_id` int NOT NULL,
  `team_number` tinyint NOT NULL,
  `kills` int DEFAULT '0',
  `deaths` int DEFAULT '0',
  `assists` int DEFAULT '0',
  `elo_before` int NOT NULL,
  `elo_after` int DEFAULT NULL,
  PRIMARY KEY (`match_id`,`player_id`),
  KEY `fk_mp_player` (`player_id`),
  CONSTRAINT `fk_mp_match` FOREIGN KEY (`match_id`) REFERENCES `matches` (`match_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mp_player` FOREIGN KEY (`player_id`) REFERENCES `players` (`player_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_team_number` CHECK ((`team_number` in (1,2)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `matches`
--

DROP TABLE IF EXISTS `matches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `matches` (
  `match_id` int NOT NULL AUTO_INCREMENT,
  `game_id` int NOT NULL,
  `tournament_id` int DEFAULT NULL,
  `match_type` enum('ranked','casual','tournament') COLLATE utf8mb4_unicode_ci DEFAULT 'ranked',
  `status` enum('scheduled','in_progress','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'scheduled',
  `started_at` timestamp NULL DEFAULT NULL,
  `ended_at` timestamp NULL DEFAULT NULL,
  `winning_team` tinyint DEFAULT NULL,
  PRIMARY KEY (`match_id`),
  KEY `fk_matches_tourn` (`tournament_id`),
  KEY `idx_matches_game_status` (`game_id`,`status`),
  CONSTRAINT `fk_matches_game` FOREIGN KEY (`game_id`) REFERENCES `games` (`game_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_matches_tourn` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`tournament_id`) ON DELETE SET NULL,
  CONSTRAINT `chk_match_times` CHECK (((`ended_at` is null) or (`started_at` is null) or (`ended_at` >= `started_at`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `matchmaking_queue`
--

DROP TABLE IF EXISTS `matchmaking_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `matchmaking_queue` (
  `queue_id` int NOT NULL AUTO_INCREMENT,
  `player_id` int NOT NULL,
  `game_id` int NOT NULL,
  `queued_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('waiting','matched','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'waiting',
  PRIMARY KEY (`queue_id`),
  UNIQUE KEY `uq_queue_active` (`player_id`,`game_id`,`status`),
  KEY `idx_queue_lookup` (`game_id`,`status`,`queued_at`),
  CONSTRAINT `fk_queue_game` FOREIGN KEY (`game_id`) REFERENCES `games` (`game_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_queue_player` FOREIGN KEY (`player_id`) REFERENCES `players` (`player_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `player_game_stats`
--

DROP TABLE IF EXISTS `player_game_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `player_game_stats` (
  `player_id` int NOT NULL,
  `game_id` int NOT NULL,
  `elo_rating` int NOT NULL DEFAULT '1000',
  `rank_tier` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'Unranked',
  `matches_played` int NOT NULL DEFAULT '0',
  `wins` int NOT NULL DEFAULT '0',
  `losses` int NOT NULL DEFAULT '0',
  `draws` int NOT NULL DEFAULT '0',
  `last_played_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`player_id`,`game_id`),
  KEY `idx_pgs_leaderboard` (`game_id`,`elo_rating` DESC),
  CONSTRAINT `fk_pgs_game` FOREIGN KEY (`game_id`) REFERENCES `games` (`game_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pgs_player` FOREIGN KEY (`player_id`) REFERENCES `players` (`player_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_elo_positive` CHECK ((`elo_rating` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `players`
--

DROP TABLE IF EXISTS `players`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `players` (
  `player_id` int NOT NULL,
  `display_name` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `region` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `country` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_joined` date DEFAULT (curdate()),
  PRIMARY KEY (`player_id`),
  FULLTEXT KEY `idx_players_search` (`display_name`),
  CONSTRAINT `fk_players_user` FOREIGN KEY (`player_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tournament_participants`
--

DROP TABLE IF EXISTS `tournament_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournament_participants` (
  `tournament_id` int NOT NULL,
  `player_id` int NOT NULL,
  `seed` int DEFAULT NULL,
  `registered_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tournament_id`,`player_id`),
  KEY `fk_tp_player` (`player_id`),
  CONSTRAINT `fk_tp_player` FOREIGN KEY (`player_id`) REFERENCES `players` (`player_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tp_tourn` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`tournament_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tournaments`
--

DROP TABLE IF EXISTS `tournaments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tournaments` (
  `tournament_id` int NOT NULL AUTO_INCREMENT,
  `game_id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('upcoming','ongoing','completed','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'upcoming',
  `created_by` int NOT NULL,
  PRIMARY KEY (`tournament_id`),
  KEY `fk_tourn_game` (`game_id`),
  KEY `fk_tourn_creator` (`created_by`),
  CONSTRAINT `fk_tourn_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_tourn_game` FOREIGN KEY (`game_id`) REFERENCES `games` (`game_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_tourn_dates` CHECK (((`end_date` is null) or (`end_date` >= `start_date`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','staff','player') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'player',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  `last_login` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`),
  CONSTRAINT `chk_username_len` CHECK ((char_length(`username`) >= 3))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `v_leaderboard`
--

DROP TABLE IF EXISTS `v_leaderboard`;
/*!50001 DROP VIEW IF EXISTS `v_leaderboard`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_leaderboard` AS SELECT 
 1 AS `game_title`,
 1 AS `player_id`,
 1 AS `display_name`,
 1 AS `region`,
 1 AS `elo_rating`,
 1 AS `rank_tier`,
 1 AS `wins`,
 1 AS `losses`,
 1 AS `matches_played`,
 1 AS `leaderboard_rank`*/;
SET character_set_client = @saved_cs_client;

--
-- Dumping routines for database 'esports_platform'
--

--
-- Final view structure for view `v_leaderboard`
--

/*!50001 DROP VIEW IF EXISTS `v_leaderboard`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_leaderboard` AS select `g`.`title` AS `game_title`,`pgs`.`player_id` AS `player_id`,`p`.`display_name` AS `display_name`,`p`.`region` AS `region`,`pgs`.`elo_rating` AS `elo_rating`,`pgs`.`rank_tier` AS `rank_tier`,`pgs`.`wins` AS `wins`,`pgs`.`losses` AS `losses`,`pgs`.`matches_played` AS `matches_played`,rank() OVER (PARTITION BY `pgs`.`game_id` ORDER BY `pgs`.`elo_rating` desc )  AS `leaderboard_rank` from ((`player_game_stats` `pgs` join `players` `p` on((`pgs`.`player_id` = `p`.`player_id`))) join `games` `g` on((`pgs`.`game_id` = `g`.`game_id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-27 16:13:23
