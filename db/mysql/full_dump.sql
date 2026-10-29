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
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `elo_history`
--

LOCK TABLES `elo_history` WRITE;
/*!40000 ALTER TABLE `elo_history` DISABLE KEYS */;
INSERT INTO `elo_history` (`history_id`, `player_id`, `game_id`, `match_id`, `old_elo`, `new_elo`, `recorded_at`) VALUES (1,2,3,1,1450,1460,'2026-10-27 10:59:42'),(2,3,3,1,1320,1310,'2026-10-27 10:59:42'),(3,4,3,2,1385,1394,'2026-10-27 15:37:04'),(4,5,3,2,1210,1201,'2026-10-27 15:37:04'),(5,2,3,3,1460,1437,'2026-10-27 15:42:41'),(6,3,3,3,1310,1333,'2026-10-27 15:42:41'),(7,2,3,8,1437,1448,'2026-10-28 03:07:09'),(8,3,3,8,1333,1322,'2026-10-28 03:07:09');
/*!40000 ALTER TABLE `elo_history` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `games`
--

LOCK TABLES `games` WRITE;
/*!40000 ALTER TABLE `games` DISABLE KEYS */;
INSERT INTO `games` VALUES (1,'Valorant','Tactical Shooter',5,1),(2,'CS2','Tactical Shooter',5,1),(3,'Chess.io','1v1 Strategy',1,1);
/*!40000 ALTER TABLE `games` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `match_players`
--

LOCK TABLES `match_players` WRITE;
/*!40000 ALTER TABLE `match_players` DISABLE KEYS */;
INSERT INTO `match_players` VALUES (1,2,1,0,0,0,1450,1460),(1,3,2,0,0,0,1320,1310),(2,4,1,0,0,0,1385,1394),(2,5,2,0,0,0,1210,1201),(3,2,1,0,0,0,1460,1437),(3,3,2,0,0,0,1310,1333),(8,2,1,0,0,0,1437,1448),(8,3,2,0,0,0,1333,1322);
/*!40000 ALTER TABLE `match_players` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_match_players_after_update` AFTER UPDATE ON `match_players` FOR EACH ROW BEGIN
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
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

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
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `matches`
--

LOCK TABLES `matches` WRITE;
/*!40000 ALTER TABLE `matches` DISABLE KEYS */;
INSERT INTO `matches` VALUES (1,3,NULL,'ranked','completed','2026-10-27 09:59:31','2026-10-27 10:59:42',1),(2,3,NULL,'ranked','completed','2026-10-27 10:29:31','2026-10-27 15:37:04',1),(3,3,NULL,'ranked','completed','2026-10-27 15:42:15','2026-10-27 15:42:41',2),(8,3,NULL,'ranked','completed','2026-10-28 03:06:18','2026-10-28 03:07:09',1);
/*!40000 ALTER TABLE `matches` ENABLE KEYS */;
UNLOCK TABLES;

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
  `active_slot` tinyint GENERATED ALWAYS AS (if((`status` = _utf8mb4'waiting'),1,NULL)) VIRTUAL,
  PRIMARY KEY (`queue_id`),
  UNIQUE KEY `uq_queue_one_waiting` (`player_id`,`game_id`,`active_slot`),
  KEY `idx_queue_lookup` (`game_id`,`status`,`queued_at`),
  CONSTRAINT `fk_queue_game` FOREIGN KEY (`game_id`) REFERENCES `games` (`game_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_queue_player` FOREIGN KEY (`player_id`) REFERENCES `players` (`player_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `matchmaking_queue`
--

LOCK TABLES `matchmaking_queue` WRITE;
/*!40000 ALTER TABLE `matchmaking_queue` DISABLE KEYS */;
INSERT INTO `matchmaking_queue` (`queue_id`, `player_id`, `game_id`, `queued_at`, `status`) VALUES (1,2,3,'2026-10-27 15:41:27','matched'),(2,3,3,'2026-10-27 15:41:28','matched'),(3,2,3,'2026-10-28 02:57:04','matched'),(4,3,3,'2026-10-28 02:57:56','matched'),(5,2,3,'2026-10-28 03:09:49','cancelled'),(6,2,3,'2026-10-28 03:09:54','cancelled');
/*!40000 ALTER TABLE `matchmaking_queue` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_queue_before_insert` BEFORE INSERT ON `matchmaking_queue` FOR EACH ROW BEGIN
    INSERT INTO player_game_stats (player_id, game_id)
    SELECT NEW.player_id, NEW.game_id
    WHERE NOT EXISTS (
        SELECT 1 FROM player_game_stats
        WHERE player_id = NEW.player_id AND game_id = NEW.game_id
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

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
-- Dumping data for table `player_game_stats`
--

LOCK TABLES `player_game_stats` WRITE;
/*!40000 ALTER TABLE `player_game_stats` DISABLE KEYS */;
INSERT INTO `player_game_stats` VALUES (2,1,1280,'Silver',25,12,13,0,'2026-10-25 10:59:31'),(2,3,1448,'Gold',23,14,9,0,'2026-10-28 03:07:09'),(3,1,1190,'Bronze',22,10,12,0,'2026-10-25 10:59:31'),(3,3,1322,'Silver',21,10,11,0,'2026-10-28 03:07:09'),(4,1,1510,'Platinum',30,19,11,0,'2026-10-25 10:59:31'),(4,3,1394,'Silver',16,9,7,0,'2026-10-27 15:37:04'),(5,1,1105,'Bronze',14,6,8,0,'2026-10-25 10:59:31'),(5,3,1201,'Bronze',13,5,8,0,'2026-10-27 15:37:04');
/*!40000 ALTER TABLE `player_game_stats` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `players`
--

LOCK TABLES `players` WRITE;
/*!40000 ALTER TABLE `players` DISABLE KEYS */;
INSERT INTO `players` VALUES (2,'AliceStrikes','APAC','India','2026-10-27'),(3,'BobFrag','NA','USA','2026-10-27'),(4,'CarlaClutch','EU','Germany','2026-10-27'),(5,'DanDagger','APAC','India','2026-10-27'),(7,'ErinAce','India',NULL,'2026-10-27');
/*!40000 ALTER TABLE `players` ENABLE KEYS */;
UNLOCK TABLES;

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
-- Dumping data for table `tournament_participants`
--

LOCK TABLES `tournament_participants` WRITE;
/*!40000 ALTER TABLE `tournament_participants` DISABLE KEYS */;
/*!40000 ALTER TABLE `tournament_participants` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_tp_before_insert` BEFORE INSERT ON `tournament_participants` FOR EACH ROW BEGIN
  DECLARE current_count INT;
  SELECT COUNT(*) INTO current_count
    FROM tournament_participants
   WHERE tournament_id = NEW.tournament_id;
  IF current_count >= 16 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Tournament is full (maximum 16 participants)';
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

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
-- Dumping data for table `tournaments`
--

LOCK TABLES `tournaments` WRITE;
/*!40000 ALTER TABLE `tournaments` DISABLE KEYS */;
/*!40000 ALTER TABLE `tournaments` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'rachel','rachel@test.com','$2b$10$dkFS5LTW9tEEfCH23fzn1OYXaCbuEJvBg7HKWdJpbWv0F37QtX50W','admin','2026-10-27 10:51:19',1,'2026-10-29 12:50:09'),(2,'alice99','alice@esports.com','$2b$10$KSJlh6WG6uL71OvhogS28O9Yd00KBxlYLAC.JPH/0KZjMoyv8xzPG','player','2026-10-27 10:59:31',1,'2026-10-29 12:51:33'),(3,'bob_gg','bob@esports.com','$2b$10$KSJlh6WG6uL71OvhogS28O9Yd00KBxlYLAC.JPH/0KZjMoyv8xzPG','player','2026-10-27 10:59:31',1,'2026-10-28 03:09:44'),(4,'carla_x','carla@esports.com','$2b$10$KSJlh6WG6uL71OvhogS28O9Yd00KBxlYLAC.JPH/0KZjMoyv8xzPG','player','2026-10-27 10:59:31',1,NULL),(5,'dev_dan','dan@esports.com','$2b$10$KSJlh6WG6uL71OvhogS28O9Yd00KBxlYLAC.JPH/0KZjMoyv8xzPG','player','2026-10-27 10:59:31',1,NULL),(6,'mod_sam','sam@esports.com','$2b$10$KSJlh6WG6uL71OvhogS28O9Yd00KBxlYLAC.JPH/0KZjMoyv8xzPG','staff','2026-10-27 10:59:31',1,'2026-10-29 12:52:27'),(7,'erin_ace','erin@esports.com','$2b$10$Kz7/HNXBdFTfFUlaAp9X4eXjd6eCvnQljmeJ2k.vM7FkX.oPBdwQa','player','2026-10-27 15:40:11',1,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

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
/*!50003 DROP PROCEDURE IF EXISTS `sp_seed_tournament` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_seed_tournament`(IN p_tournament_id INT)
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_settle_match` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_settle_match`(IN p_match_id INT, IN p_winning_team TINYINT)
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
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

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

-- Dump completed on 2026-10-29 18:25:03
