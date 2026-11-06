-- MySQL dump 10.13  Distrib 8.4.13, for Linux (x86_64)
--
-- Host: localhost    Database: student_care_local
-- ------------------------------------------------------
-- Server version	8.4.13

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
-- Table structure for table `care_case`
--

DROP TABLE IF EXISTS `care_case`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `care_case` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `active_student_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `close_type` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `opened_on` date NOT NULL,
  `closed_on` date DEFAULT NULL,
  `closed_at` datetime(6) DEFAULT NULL,
  `recheck_date` date DEFAULT NULL,
  `plan_goal` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plan_action` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plan_load_limit` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plan_agreed_with_student` tinyint(1) DEFAULT NULL,
  `version` bigint NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `metric_formula_version` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_care_case_branch_active_student` (`branch_id`,`active_student_id`),
  KEY `idx_care_case_student_closed` (`student_id`,`closed_on`),
  KEY `idx_care_case_branch_status_closed` (`branch_id`,`status`,`closed_on`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `care_case`
--

LOCK TABLES `care_case` WRITE;
/*!40000 ALTER TABLE `care_case` DISABLE KEYS */;
INSERT INTO `care_case` VALUES ('care_04ccd119-6a7c-466e-8123-36237a0e4389','demo_large','demo_s006',NULL,'CLOSED','ADJUSTMENT_NEEDED','AFTER_RECHECK','2026-10-20','2026-10-28','2026-10-28 03:00:00.000000',NULL,NULL,NULL,NULL,NULL,4,'2026-10-20 03:00:00.000000','2026-10-28 03:00:00.000000',3),('care_08161aef-8bba-4bb4-b3a2-f3577b2e5138','demo_small','demo_s100','demo_s100','IN_ADJUSTMENT','ADJUSTMENT_NEEDED',NULL,'2026-10-28',NULL,NULL,'2026-11-04',NULL,NULL,NULL,NULL,1,'2026-10-28 03:00:00.000000','2026-10-28 03:00:00.000000',3),('care_0c577f66-ec5f-407c-95f1-a2e00ff80c2b','demo_medium','demo_s062','demo_s062','IN_ADJUSTMENT','ADJUSTMENT_NEEDED',NULL,'2026-10-25',NULL,NULL,'2026-11-04',NULL,NULL,NULL,NULL,3,'2026-10-25 03:00:00.000000','2026-10-28 03:00:00.000000',3),('care_105140bf-a62f-49e8-b306-a04fef8f4bcd','demo_large','demo_s014','demo_s014','IN_ADJUSTMENT','ADJUSTMENT_NEEDED',NULL,'2026-10-25',NULL,NULL,'2026-10-30',NULL,NULL,NULL,NULL,4,'2026-10-25 03:00:00.000000','2026-10-28 03:00:00.000000',3),('care_35415023-3226-40fc-bd3a-bcffef4848a2','demo_large','demo_s019',NULL,'CLOSED','EXPECTED_CHANGE','EXPECTED_CHANGE','2026-10-26','2026-10-26','2026-10-26 03:00:00.000000',NULL,NULL,NULL,NULL,NULL,1,'2026-10-26 03:00:00.000000','2026-10-26 03:00:00.000000',3),('care_4421d026-2147-4106-8956-bfe867dfb4a2','demo_large','demo_s027','demo_s027','IN_ADJUSTMENT','ADJUSTMENT_NEEDED',NULL,'2026-10-26',NULL,NULL,'2026-11-02',NULL,NULL,NULL,NULL,2,'2026-10-26 03:00:00.000000','2026-10-28 03:00:00.000000',3),('care_51f10901-db19-4501-a7bd-69c15a28850d','demo_medium','demo_s065','demo_s065','IN_ADJUSTMENT','ADJUSTMENT_NEEDED',NULL,'2026-10-26',NULL,NULL,'2026-11-01',NULL,NULL,NULL,NULL,2,'2026-10-26 03:00:00.000000','2026-10-28 03:00:00.000000',3),('care_539d2d45-f3af-421d-8da8-45b53b5119f0','demo_medium','demo_s070','demo_s070','IN_ADJUSTMENT','ADJUSTMENT_NEEDED',NULL,'2026-10-25',NULL,NULL,'2026-11-03',NULL,NULL,NULL,NULL,3,'2026-10-25 03:00:00.000000','2026-10-28 03:00:00.000000',3),('care_660c1f61-e46d-4f48-bd33-bbdf0e150087','br_gangnam','stu_002','stu_002','IN_ADJUSTMENT','ADJUSTMENT_NEEDED',NULL,'2026-10-25',NULL,NULL,'2026-11-01',NULL,NULL,NULL,NULL,1,'2026-10-25 03:00:00.000000','2026-10-25 03:00:00.000000',2),('care_67f1d312-6615-4fc8-a337-42830adbfd58','demo_large','demo_s030',NULL,'CLOSED','RECORD_ISSUE','RECORD_ISSUE','2026-10-25','2026-10-25','2026-10-25 03:00:00.000000',NULL,NULL,NULL,NULL,NULL,1,'2026-10-25 03:00:00.000000','2026-10-25 03:00:00.000000',3),('care_83108a2d-1e6f-4710-b52b-7355bf7d90c9','demo_large','demo_s016','demo_s016','IN_ADJUSTMENT','ADJUSTMENT_NEEDED',NULL,'2026-10-25',NULL,NULL,'2026-11-02',NULL,NULL,NULL,NULL,3,'2026-10-25 03:00:00.000000','2026-10-28 03:00:00.000000',3),('care_9356a433-053a-45d1-bb6c-0e205a747cca','demo_large','demo_s003','demo_s003','IN_ADJUSTMENT','ADJUSTMENT_NEEDED',NULL,'2026-10-26',NULL,NULL,'2026-11-04',NULL,NULL,NULL,NULL,3,'2026-10-26 03:00:00.000000','2026-10-28 03:00:00.000000',3),('care_a5c75fdc-e55d-4d31-a466-a377806691d4','demo_large','demo_s035','demo_s035','IN_ADJUSTMENT','ADJUSTMENT_NEEDED',NULL,'2026-10-28',NULL,NULL,'2026-11-04',NULL,NULL,NULL,NULL,1,'2026-10-28 03:00:00.000000','2026-10-28 03:00:00.000000',3),('care_e103831c-2610-4e1f-bcd9-e95768d1d58a','demo_small','demo_s092','demo_s092','IN_ADJUSTMENT','ADJUSTMENT_NEEDED',NULL,'2026-10-25',NULL,NULL,'2026-11-01',NULL,NULL,NULL,NULL,3,'2026-10-25 03:00:00.000000','2026-10-28 03:00:00.000000',3);
/*!40000 ALTER TABLE `care_case` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `care_case_baseline`
--

DROP TABLE IF EXISTS `care_case_baseline`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `care_case_baseline` (
  `case_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `position` int NOT NULL,
  `signal_type` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `summary` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `metric_value` int NOT NULL,
  `target_value` int DEFAULT NULL,
  `subject` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`case_id`,`position`),
  CONSTRAINT `fk_care_case_baseline_case` FOREIGN KEY (`case_id`) REFERENCES `care_case` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `care_case_baseline`
--

LOCK TABLES `care_case_baseline` WRITE;
/*!40000 ALTER TABLE `care_case_baseline` DISABLE KEYS */;
INSERT INTO `care_case_baseline` VALUES ('care_04ccd119-6a7c-466e-8123-36237a0e4389',0,'EXECUTION_GAP','최근 7일 계획 달성률 41%',41,60,NULL),('care_08161aef-8bba-4bb4-b3a2-f3577b2e5138',0,'SUBJECT_SHARE','수학 계획 29% → 실제 5%',5,29,'수학'),('care_0c577f66-ec5f-407c-95f1-a2e00ff80c2b',0,'START_TIME_SHIFT','평소보다 69분 늦게 입실',69,0,NULL),('care_105140bf-a62f-49e8-b306-a04fef8f4bcd',0,'CONSECUTIVE_ABSENCE','최근 7일 중 1일 미입실',1,NULL,NULL),('care_35415023-3226-40fc-bd3a-bcffef4848a2',0,'PLAN_MISSING','최근 7일 중 2일 미제출',2,NULL,NULL),('care_4421d026-2147-4106-8956-bfe867dfb4a2',0,'SUBJECT_SHARE','수학 계획 36% → 실제 14%',14,36,'수학'),('care_51f10901-db19-4501-a7bd-69c15a28850d',0,'PLAN_MISSING','최근 7일 중 2일 미제출',2,NULL,NULL),('care_539d2d45-f3af-421d-8da8-45b53b5119f0',0,'EXECUTION_GAP','최근 7일 계획 달성률 53%',53,60,NULL),('care_660c1f61-e46d-4f48-bd33-bbdf0e150087',0,'PLAN_MISSING','최근 7일 중 4일 미제출',4,NULL,NULL),('care_67f1d312-6615-4fc8-a337-42830adbfd58',0,'PLAN_MISSING','최근 7일 중 2일 미제출',2,NULL,NULL),('care_83108a2d-1e6f-4710-b52b-7355bf7d90c9',0,'EXECUTION_GAP','최근 7일 계획 달성률 56%',56,60,NULL),('care_9356a433-053a-45d1-bb6c-0e205a747cca',0,'PLAN_MISSING','최근 7일 중 2일 미제출',2,NULL,NULL),('care_a5c75fdc-e55d-4d31-a466-a377806691d4',0,'START_TIME_SHIFT','평소보다 101분 늦게 입실',101,0,NULL),('care_e103831c-2610-4e1f-bcd9-e95768d1d58a',0,'PLAN_MISSING','최근 7일 중 2일 미제출',2,NULL,NULL);
/*!40000 ALTER TABLE `care_case_baseline` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `care_event`
--

DROP TABLE IF EXISTS `care_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `care_event` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `case_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sequence` int NOT NULL,
  `event_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `occurred_on` date NOT NULL,
  `content` varchar(1200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `note_channel` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `record_no` bigint NOT NULL AUTO_INCREMENT,
  `actor_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_care_event_case_sequence` (`case_id`,`sequence`),
  UNIQUE KEY `uk_care_event_record_no` (`record_no`),
  KEY `idx_care_event_student` (`student_id`,`created_at`),
  CONSTRAINT `fk_care_event_case` FOREIGN KEY (`case_id`) REFERENCES `care_case` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `care_event`
--

LOCK TABLES `care_event` WRITE;
/*!40000 ALTER TABLE `care_event` DISABLE KEYS */;
INSERT INTO `care_event` VALUES ('evt_003e2a1f-9c10-4297-b303-2e8eee39f596','care_04ccd119-6a7c-466e-8123-36237a0e4389','demo_s006',3,'NOTE','2026-10-23','상담 · 문자 — 계획 분량을 줄여 작성하고 있다고 답함. 제출 기록만으로 완료 여부를 단정하지 않고 다음 면담에서 실제 진행 상황을 함께 확인하기로 함.','MESSAGE','2026-10-23 03:00:00.000000',15,NULL),('evt_013fde1e-79a5-42f5-a9a4-69353002fe5b','care_a5c75fdc-e55d-4d31-a466-a377806691d4','demo_s035',2,'ADJUSTMENT_STARTED','2026-10-28','계속 관리 · 다음 점검 11월 4일',NULL,'2026-10-28 03:00:00.000000',12,NULL),('evt_0323498b-5a41-4a9b-9c5a-e3e3d9b4dc18','care_9356a433-053a-45d1-bb6c-0e205a747cca','demo_s003',5,'CONTINUED','2026-10-28','계속 관리 · 다음 점검 11월 4일',NULL,'2026-10-28 03:00:00.000000',23,NULL),('evt_04e6c668-1d01-44a7-b227-44e049506bf8','care_e103831c-2610-4e1f-bcd9-e95768d1d58a','demo_s092',5,'CONTINUED','2026-10-28','계속 관리 · 다음 점검 11월 1일',NULL,'2026-10-28 03:00:00.000000',59,NULL),('evt_08f70b2d-8e05-44fb-a85f-930e3af7db3d','care_67f1d312-6615-4fc8-a337-42830adbfd58','demo_s030',2,'CLOSED','2026-10-25','기록 오류 · 관리 종료',NULL,'2026-10-25 03:00:00.000000',41,NULL),('evt_128a8b2b-d0ef-4461-bf4a-ae16b5d7016c','care_105140bf-a62f-49e8-b306-a04fef8f4bcd','demo_s014',6,'CONTINUED','2026-10-28','계속 관리 · 다음 점검 10월 30일',NULL,'2026-10-28 03:00:00.000000',37,NULL),('evt_27b54332-206d-42d3-8e75-0ecb5203f0ba','care_105140bf-a62f-49e8-b306-a04fef8f4bcd','demo_s014',2,'ADJUSTMENT_STARTED','2026-10-25','계속 관리 · 다음 점검 10월 28일',NULL,'2026-10-25 03:00:00.000000',33,NULL),('evt_2c2a1bee-e90f-484a-b166-9256880355da','care_0c577f66-ec5f-407c-95f1-a2e00ff80c2b','demo_s062',5,'CONTINUED','2026-10-28','계속 관리 · 다음 점검 11월 4일',NULL,'2026-10-28 03:00:00.000000',46,NULL),('evt_3979b493-e8a9-483a-a3db-dc7959d0eb49','care_660c1f61-e46d-4f48-bd33-bbdf0e150087','stu_002',5,'NOTE','2026-10-25','상담 · 면담 — API 연결 검증 1792949445361','MEETING','2026-10-25 03:00:00.000000',5,NULL),('evt_399f5ed9-b37a-4747-b8a0-a9c84ebe5c25','care_08161aef-8bba-4bb4-b3a2-f3577b2e5138','demo_s100',2,'ADJUSTMENT_STARTED','2026-10-28','계속 관리 · 다음 점검 11월 4일',NULL,'2026-10-28 03:00:00.000000',61,NULL),('evt_3cb69aa4-b9ef-498b-ab3b-2c4d4a73a3ce','care_539d2d45-f3af-421d-8da8-45b53b5119f0','demo_s070',2,'ADJUSTMENT_STARTED','2026-10-25','계속 관리 · 다음 점검 10월 28일',NULL,'2026-10-25 03:00:00.000000',51,NULL),('evt_3d28b622-cfd6-4b2e-a7b6-1de7accdc967','care_539d2d45-f3af-421d-8da8-45b53b5119f0','demo_s070',4,'RECHECKED','2026-10-28','점검 · 나빠짐 — 달성률 53% → 37%',NULL,'2026-10-28 03:00:00.000000',53,NULL),('evt_4beddd56-378f-455f-bb78-84ec31fe3da8','care_105140bf-a62f-49e8-b306-a04fef8f4bcd','demo_s014',4,'NOTE','2026-10-28','상담 · 문자 — 아직 일정 답변이 없어 관리 종료하지 않음. 다음 연락에서 미입실 이유와 이후 일정을 직접 확인할 예정임.','MESSAGE','2026-10-28 03:00:00.000000',35,NULL),('evt_52154988-021a-45b0-9e62-a16511443001','care_660c1f61-e46d-4f48-bd33-bbdf0e150087','stu_002',4,'NOTE','2026-10-25','상담 · 면담 — API 연결 검증 1792949361994','MEETING','2026-10-25 03:00:00.000000',4,NULL),('evt_5c2971f2-6d1d-481d-abe0-3f2b18671c8d','care_4421d026-2147-4106-8956-bfe867dfb4a2','demo_s027',3,'NOTE','2026-10-28','상담 · 문자 — 수학부터 시작하는 방식으로 바꿔보겠다고 답함. 과목 비중만으로 학습 성과를 판단하지 않고 실제 진행한 내용을 다음 면담에서 확인할 예정임.','MESSAGE','2026-10-28 03:00:00.000000',31,NULL),('evt_5c8dd20b-b528-4f09-923c-2171ce72e341','care_35415023-3226-40fc-bd3a-bcffef4848a2','demo_s019',2,'CLOSED','2026-10-26','문제없음 · 관리 종료',NULL,'2026-10-26 03:00:00.000000',39,NULL),('evt_656ff223-8e64-4e32-851f-038ff0e43211','care_67f1d312-6615-4fc8-a337-42830adbfd58','demo_s030',1,'REASON_CONFIRMED','2026-10-25','상담 · 통화 — 학생은 계획을 제출했다고 답했으나 조회 기록과 일치하지 않음. 제출한 날짜와 화면을 확인해 원본 기록 확인을 요청함. 학습 태도 문제로 단정하지 않으며, 기록 정정 여부는 별도로 확인하기로 함.','CALL','2026-10-25 03:00:00.000000',40,NULL),('evt_65a3f581-e0e2-4341-a9c9-666a6dadfdf9','care_0c577f66-ec5f-407c-95f1-a2e00ff80c2b','demo_s062',3,'NOTE','2026-10-28','상담 · 면담 — 변경된 일정이 이번 주에도 이어지고 있음. 늦은 시각 자체보다 학습량과 계획 수행에 영향을 주는지 추가로 확인하기로 함.','MEETING','2026-10-28 03:00:00.000000',44,NULL),('evt_66128cb1-f52d-4523-9a3a-8f6bac7b439c','care_08161aef-8bba-4bb4-b3a2-f3577b2e5138','demo_s100',1,'REASON_CONFIRMED','2026-10-28','상담 · 면담 — 최근 수학의 계획 비중과 실제 학습 비중이 다르게 나타남. 다른 과목에 시간이 더 걸렸다고 설명하여 하루 계획에서 과목별 우선순위를 다시 정함. 다음 주 실제 비중과 진행한 분량을 함께 확인하기로 함.','MEETING','2026-10-28 03:00:00.000000',60,NULL),('evt_6b20dab2-fb04-4a69-8f66-1575c136c6f0','care_83108a2d-1e6f-4710-b52b-7355bf7d90c9','demo_s016',2,'ADJUSTMENT_STARTED','2026-10-25','계속 관리 · 다음 점검 10월 28일',NULL,'2026-10-25 03:00:00.000000',25,NULL),('evt_6ce8bad6-5eaa-4a83-9fc6-2572a7d222f8','care_04ccd119-6a7c-466e-8123-36237a0e4389','demo_s006',1,'REASON_CONFIRMED','2026-10-20','상담 · 면담 — 하루에 끝내기 어려운 분량을 계획하고 있어 실제 학습량과 차이가 컸음. 우선순위 과목 두 개부터 마치고 남은 분량을 다음 날로 나누기로 함.','MEETING','2026-10-20 03:00:00.000000',13,NULL),('evt_7ac0c8cd-f508-4b2e-aee2-394ff911d5f1','care_e103831c-2610-4e1f-bcd9-e95768d1d58a','demo_s092',3,'NOTE','2026-10-28','상담 · 문자 — 최근에도 미제출 날짜가 남아 있음. 작성이 어려운 항목을 다음 입실 때 함께 확인하기로 하여 관리를 이어감.','MESSAGE','2026-10-28 03:00:00.000000',57,NULL),('evt_7b3265ab-f073-488c-9c9c-c47699ac13ab','care_e103831c-2610-4e1f-bcd9-e95768d1d58a','demo_s092',1,'REASON_CONFIRMED','2026-10-25','상담 · 면담 — 입실 후 공부는 하고 있으나 계획 제출 누락이 반복됨. 제출 여부를 직접 확인하는 습관부터 잡고, 다음 점검 때 누락 날짜를 함께 보며 원인을 확인하기로 함.','MEETING','2026-10-25 03:00:00.000000',55,NULL),('evt_842fd4fe-08b7-4f56-b723-e14df8e5725d','care_4421d026-2147-4106-8956-bfe867dfb4a2','demo_s027',1,'REASON_CONFIRMED','2026-10-26','상담 · 면담 — 전체 학습량보다 수학 계획 비중과 실제 비중의 차이가 큼. 수학을 마지막 순서에 두면 다음 날로 미룬다고 답함. 입실 후 첫 학습에 수학 문제 풀이를 배치하고 진행 상황을 다시 보기로 함.','MEETING','2026-10-26 03:00:00.000000',29,NULL),('evt_895c5029-3cc6-4c0f-83e7-1f94e6b16307','care_660c1f61-e46d-4f48-bd33-bbdf0e150087','stu_002',9,'NOTE','2026-10-25','상담 · 면담 — API 연결 검증 1792950738138','MEETING','2026-10-25 03:00:00.000000',9,NULL),('evt_97272e57-383f-4933-813d-cdba3ab69c2a','care_04ccd119-6a7c-466e-8123-36237a0e4389','demo_s006',2,'ADJUSTMENT_STARTED','2026-10-20','계속 관리 · 다음 점검 10월 27일',NULL,'2026-10-20 03:00:00.000000',14,NULL),('evt_99555d27-c998-4983-a9be-0f8fe93bc275','care_660c1f61-e46d-4f48-bd33-bbdf0e150087','stu_002',3,'NOTE','2026-10-25','상담 · 면담 — API 연결 검증 1792925824254','MEETING','2026-10-25 03:00:00.000000',3,NULL),('evt_9998d176-dfcf-44c1-b692-f4197ed85311','care_660c1f61-e46d-4f48-bd33-bbdf0e150087','stu_002',6,'NOTE','2026-10-25','상담 · 면담 — API 연결 검증 1792949952926','MEETING','2026-10-25 03:00:00.000000',6,NULL),('evt_9e447810-623c-4ea2-ba8b-c0630a537f31','care_660c1f61-e46d-4f48-bd33-bbdf0e150087','stu_002',10,'NOTE','2026-10-25','상담 · 면담 — API 연결 검증 1792975255391','MEETING','2026-10-25 03:00:00.000000',10,NULL),('evt_a18d5b11-78b7-44bc-bc04-a90b139e64d1','care_9356a433-053a-45d1-bb6c-0e205a747cca','demo_s003',1,'REASON_CONFIRMED','2026-10-26','상담 · 면담 — 입실은 하고 있으나 계획 제출을 빠뜨리는 날이 반복됨. 입실 후 첫 학습을 시작하기 전에 계획을 제출하고, 어려운 날에는 실제 가능한 분량으로 작성하기로 함.','MEETING','2026-10-26 03:00:00.000000',19,NULL),('evt_a6b5ee62-8ee1-4731-9205-c6e6fade8101','care_a5c75fdc-e55d-4d31-a466-a377806691d4','demo_s035',1,'REASON_CONFIRMED','2026-10-28','상담 · 면담 — [화면 확인용 예시]\n최근 입실이 평소보다 늦어지는 이유를 확인했습니다.\n다음 주 입실 패턴과 학습 계획을 다시 확인하기로 했습니다.','MEETING','2026-10-28 03:00:00.000000',11,NULL),('evt_a98e9947-2996-4456-893b-f7875d6059df','care_51f10901-db19-4501-a7bd-69c15a28850d','demo_s065',3,'NOTE','2026-10-28','상담 · 면담 — 계획을 저장한 뒤 제출 단계까지 완료하지 않은 것을 함께 확인함. 오늘은 제출까지 진행했고, 이후에도 이어지는지는 다음 점검에서 확인하기로 함.','MEETING','2026-10-28 03:00:00.000000',49,NULL),('evt_acff7784-56cb-491a-9071-c3c26b7e71eb','care_539d2d45-f3af-421d-8da8-45b53b5119f0','demo_s070',1,'REASON_CONFIRMED','2026-10-25','상담 · 면담 — 계획한 분량에 비해 실제 학습이 적어 진행 중 막히는 부분을 확인함. 오래 걸리는 문제를 표시해 두고 다음 과목으로 넘어가는 순서를 정하기로 함.','MEETING','2026-10-25 03:00:00.000000',50,NULL),('evt_adc6383e-e90b-42eb-adcc-fcb1966e727a','care_539d2d45-f3af-421d-8da8-45b53b5119f0','demo_s070',5,'CONTINUED','2026-10-28','계속 관리 · 다음 점검 11월 3일',NULL,'2026-10-28 03:00:00.000000',54,NULL),('evt_b3dd83c7-cf67-40f5-a135-56d6902609b2','care_0c577f66-ec5f-407c-95f1-a2e00ff80c2b','demo_s062',2,'ADJUSTMENT_STARTED','2026-10-25','계속 관리 · 다음 점검 10월 28일',NULL,'2026-10-25 03:00:00.000000',43,NULL),('evt_b885214e-6bce-45c1-9e44-8c856b073e77','care_660c1f61-e46d-4f48-bd33-bbdf0e150087','stu_002',1,'REASON_CONFIRMED','2026-10-25','상담 · 면담 — API 연결 검증 1792925420930','MEETING','2026-10-25 03:00:00.000000',1,NULL),('evt_bafd131b-572a-48eb-98d8-3214a9def634','care_660c1f61-e46d-4f48-bd33-bbdf0e150087','stu_002',2,'ADJUSTMENT_STARTED','2026-10-25','계속 관리 · 다음 점검 11월 1일',NULL,'2026-10-25 03:00:00.000000',2,NULL),('evt_be0a676d-fa08-4368-aeb8-78779a0f3838','care_9356a433-053a-45d1-bb6c-0e205a747cca','demo_s003',2,'ADJUSTMENT_STARTED','2026-10-26','계속 관리 · 다음 점검 10월 28일',NULL,'2026-10-26 03:00:00.000000',20,NULL),('evt_be7a6efb-9d1d-4e5d-b64a-b9b646bc5863','care_4421d026-2147-4106-8956-bfe867dfb4a2','demo_s027',2,'ADJUSTMENT_STARTED','2026-10-26','계속 관리 · 다음 점검 11월 2일',NULL,'2026-10-26 03:00:00.000000',30,NULL),('evt_c7c1bef1-7633-460c-980a-84b007cdce00','care_0c577f66-ec5f-407c-95f1-a2e00ff80c2b','demo_s062',1,'REASON_CONFIRMED','2026-10-25','상담 · 통화 — 최근 입실이 본인의 평소 시간보다 늦어지고 있음. 학생은 하교 후 일정이 바뀌었다고 설명함. 다른 학생의 입실 시각과 비교하지 않고 새 일정에서도 학습 시간이 확보되는지 확인하기로 함.','CALL','2026-10-25 03:00:00.000000',42,NULL),('evt_d2a00c64-28ef-4ad1-add0-552fd165ac4a','care_e103831c-2610-4e1f-bcd9-e95768d1d58a','demo_s092',2,'ADJUSTMENT_STARTED','2026-10-25','계속 관리 · 다음 점검 10월 28일',NULL,'2026-10-25 03:00:00.000000',56,NULL),('evt_d77848a6-c2ad-4fcf-946d-eb2640a8721e','care_04ccd119-6a7c-466e-8123-36237a0e4389','demo_s006',6,'CLOSED','2026-10-28','관리 종료',NULL,'2026-10-28 03:00:00.000000',18,NULL),('evt_da8ac191-afb4-49ec-8f80-799d17d72955','care_83108a2d-1e6f-4710-b52b-7355bf7d90c9','demo_s016',1,'REASON_CONFIRMED','2026-10-25','상담 · 통화 — 최근 학습량과 계획 대비 진행률이 함께 낮아짐. 학생은 학교 과제와 병행하기 어렵다고 설명함. 학습관에서는 당일 가능한 과목과 분량부터 정하고 다음 점검에서 유지 여부를 확인하기로 함.','CALL','2026-10-25 03:00:00.000000',24,NULL),('evt_e004c4c1-f7da-484b-a709-a99fe4413d2e','care_35415023-3226-40fc-bd3a-bcffef4848a2','demo_s019',1,'REASON_CONFIRMED','2026-10-26','상담 · 면담 — 학교 시험 대비로 별도 종이에 계획을 작성해 온라인 제출을 하지 않았다고 설명함. 작성한 계획을 함께 확인했고, 다음 입실부터 시스템에도 제출하기로 안내함. 이번 건은 추가 관리 없이 종료함.','MEETING','2026-10-26 03:00:00.000000',38,NULL),('evt_e2df75c6-9ddc-484c-bceb-2bf1ace94ea8','care_04ccd119-6a7c-466e-8123-36237a0e4389','demo_s006',5,'RECHECKED','2026-10-28','점검 · 좋아짐 — 달성률 41% → 95%',NULL,'2026-10-28 03:00:00.000000',17,NULL),('evt_e4fb1012-baf8-4674-9fd4-b417110914c2','care_105140bf-a62f-49e8-b306-a04fef8f4bcd','demo_s014',1,'REASON_CONFIRMED','2026-10-25','상담 · 통화 — 예정된 입실일에 결석이 이어져 학생에게 연락함. 이번 주 입실 가능 일정을 다시 확인하고, 다음 연락 때 실제 입실 여부와 학습 계획을 함께 점검하기로 함.','CALL','2026-10-25 03:00:00.000000',32,NULL),('evt_e59a7316-a58c-4ee1-b005-1ebcd75a775a','care_83108a2d-1e6f-4710-b52b-7355bf7d90c9','demo_s016',5,'CONTINUED','2026-10-28','계속 관리 · 다음 점검 11월 2일',NULL,'2026-10-28 03:00:00.000000',28,NULL),('evt_e6b82bb3-61c7-4a5d-a3d3-19043626f286','care_0c577f66-ec5f-407c-95f1-a2e00ff80c2b','demo_s062',4,'RECHECKED','2026-10-28','점검 · 나빠짐 — 평소 대비 입실 69분 → 102분',NULL,'2026-10-28 03:00:00.000000',45,NULL),('evt_e6cc9eff-4642-45e2-bf9b-2e096903aaac','care_51f10901-db19-4501-a7bd-69c15a28850d','demo_s065',1,'REASON_CONFIRMED','2026-10-26','상담 · 문자 — 계획 미제출이 여러 날 확인되어 작성 시점을 문의함. 학생과 다음 입실 때 직접 제출 과정을 확인하기로 약속함.','MESSAGE','2026-10-26 03:00:00.000000',47,NULL),('evt_e7d2bee2-d545-40c7-82b8-18c1b02008d2','care_105140bf-a62f-49e8-b306-a04fef8f4bcd','demo_s014',5,'RECHECKED','2026-10-28','점검 · 나빠짐 — 연속 결석 1일 → 3일',NULL,'2026-10-28 03:00:00.000000',36,NULL),('evt_e82dd9c2-1928-4228-a813-f3b5d31293d1','care_660c1f61-e46d-4f48-bd33-bbdf0e150087','stu_002',7,'NOTE','2026-10-25','상담 · 면담 — API 연결 검증 1792950181375','MEETING','2026-10-25 03:00:00.000000',7,NULL),('evt_e9b65348-25c6-49c8-823e-82da99c2f60d','care_105140bf-a62f-49e8-b306-a04fef8f4bcd','demo_s014',3,'NOTE','2026-10-27','상담 · 통화 — 통화가 연결되지 않아 입실 가능한 날짜를 알려달라는 문자를 남김.','CALL','2026-10-27 03:00:00.000000',34,NULL),('evt_f1b8e46d-9eb5-4fe1-8498-803ff025a108','care_83108a2d-1e6f-4710-b52b-7355bf7d90c9','demo_s016',3,'NOTE','2026-10-28','상담 · 면담 — 학습량이 아직 평소 수준으로 돌아오지 않았음. 당장 이전 분량을 요구하기보다 현재 계획을 실제로 마칠 수 있는지 며칠 더 확인하기로 함.','MEETING','2026-10-28 03:00:00.000000',26,NULL),('evt_f281923a-fe6c-41b3-a95b-ea9a3e834172','care_660c1f61-e46d-4f48-bd33-bbdf0e150087','stu_002',8,'NOTE','2026-10-25','상담 · 면담 — API 연결 검증 1792950589442','MEETING','2026-10-25 03:00:00.000000',8,NULL),('evt_f3223fe4-a33b-4443-955d-f475006f2fd9','care_9356a433-053a-45d1-bb6c-0e205a747cca','demo_s003',3,'NOTE','2026-10-27','상담 · 문자 — 제출 방법은 알고 있으나 바로 공부를 시작하다 잊는다고 답함. 다음 입실 때 제출 여부를 함께 확인하기로 함.','MESSAGE','2026-10-27 03:00:00.000000',21,NULL),('evt_f4ca60b1-8c14-48cb-b03d-157f08bbf79b','care_539d2d45-f3af-421d-8da8-45b53b5119f0','demo_s070',3,'NOTE','2026-10-28','상담 · 통화 — 최근 학습량이 계속 낮게 나타나 학생과 다시 통화함. 계획 분량을 조정하되 실제 완료한 내용을 다음 면담에서 확인하기로 함.','CALL','2026-10-28 03:00:00.000000',52,NULL),('evt_f5dfc883-4844-496d-ad08-f8004eaac0bf','care_9356a433-053a-45d1-bb6c-0e205a747cca','demo_s003',4,'RECHECKED','2026-10-28','점검 · 나빠짐 — 계획 미제출 2일 → 3일',NULL,'2026-10-28 03:00:00.000000',22,NULL),('evt_f5e7dbf4-eec8-4a38-ba2f-cac4800c6403','care_04ccd119-6a7c-466e-8123-36237a0e4389','demo_s006',4,'NOTE','2026-10-28','상담 · 면담 — 최근 기록에서 계획 대비 진행률이 회복된 것을 함께 확인함. 학생도 나눠서 계획하는 방식이 유지 가능하다고 답하여 이번 관리는 종료하기로 함.','MEETING','2026-10-28 03:00:00.000000',16,NULL),('evt_f86849ff-094e-4eef-b5f2-77e87149af08','care_83108a2d-1e6f-4710-b52b-7355bf7d90c9','demo_s016',4,'RECHECKED','2026-10-28','점검 · 나빠짐 — 달성률 56% → 40%',NULL,'2026-10-28 03:00:00.000000',27,NULL),('evt_fd838ea9-112c-441c-864f-a03e38f76127','care_e103831c-2610-4e1f-bcd9-e95768d1d58a','demo_s092',4,'RECHECKED','2026-10-28','점검 · 나빠짐 — 계획 미제출 2일 → 3일',NULL,'2026-10-28 03:00:00.000000',58,NULL),('evt_fe2ca5e7-221e-4a2a-9086-9b255294b859','care_51f10901-db19-4501-a7bd-69c15a28850d','demo_s065',2,'ADJUSTMENT_STARTED','2026-10-26','계속 관리 · 다음 점검 11월 1일',NULL,'2026-10-26 03:00:00.000000',48,NULL);
/*!40000 ALTER TABLE `care_event` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `care_settings`
--

DROP TABLE IF EXISTS `care_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `care_settings` (
  `branch_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `absence_days` int NOT NULL,
  `plan_missing_days` int NOT NULL,
  `study_drop_percent` int NOT NULL,
  `execution_rate_percent` int NOT NULL,
  `subject_share_gap_points` int NOT NULL,
  `start_shift_minutes` int NOT NULL,
  `min_valid_days` int NOT NULL,
  `cooldown_days` int NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `care_settings`
--

LOCK TABLES `care_settings` WRITE;
/*!40000 ALTER TABLE `care_settings` DISABLE KEYS */;
INSERT INTO `care_settings` VALUES ('br_gangnam',1,2,30,60,20,60,3,7,'2026-10-25 03:00:00.000000');
/*!40000 ALTER TABLE `care_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `care_student_lock`
--

DROP TABLE IF EXISTS `care_student_lock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `care_student_lock` (
  `branch_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`branch_id`,`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `care_student_lock`
--

LOCK TABLES `care_student_lock` WRITE;
/*!40000 ALTER TABLE `care_student_lock` DISABLE KEYS */;
INSERT INTO `care_student_lock` VALUES ('br_gangnam','stu_002'),('demo_large','demo_s003'),('demo_large','demo_s006'),('demo_large','demo_s014'),('demo_large','demo_s016'),('demo_large','demo_s019'),('demo_large','demo_s027'),('demo_large','demo_s030'),('demo_large','demo_s035'),('demo_medium','demo_s062'),('demo_medium','demo_s065'),('demo_medium','demo_s070'),('demo_small','demo_s092'),('demo_small','demo_s100');
/*!40000 ALTER TABLE `care_student_lock` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed
