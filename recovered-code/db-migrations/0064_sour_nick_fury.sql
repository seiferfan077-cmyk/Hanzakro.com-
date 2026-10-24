CREATE TABLE `competitionMatchEvaluations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`matchQuestionId` int NOT NULL,
	`answerId` int NOT NULL,
	`memberSlot` enum('saif','haneen') NOT NULL,
	`outcome` enum('correct','partial','incorrect','manual_review') NOT NULL,
	`method` enum('exact','semantic') NOT NULL,
	`confidence` int NOT NULL,
	`awardedPoints` int NOT NULL DEFAULT 0,
	`reason` varchar(1200) NOT NULL,
	`evaluatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competitionMatchEvaluations_id` PRIMARY KEY(`id`),
	CONSTRAINT `competition_evaluation_answer_unique` UNIQUE(`answerId`)
);
--> statement-breakpoint
CREATE TABLE `competitionMatchResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`winnerSlot` enum('saif','haneen'),
	`saifPoints` int NOT NULL DEFAULT 0,
	`haneenPoints` int NOT NULL DEFAULT 0,
	`finishedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competitionMatchResults_id` PRIMARY KEY(`id`),
	CONSTRAINT `competition_match_result_unique` UNIQUE(`matchId`)
);
--> statement-breakpoint
CREATE TABLE `competitionScoreLedger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`matchQuestionId` int NOT NULL,
	`memberSlot` enum('saif','haneen') NOT NULL,
	`points` int NOT NULL,
	`eventKey` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competitionScoreLedger_id` PRIMARY KEY(`id`),
	CONSTRAINT `competition_score_event_unique` UNIQUE(`eventKey`)
);
--> statement-breakpoint
CREATE INDEX `competition_evaluation_match_question_index` ON `competitionMatchEvaluations` (`matchId`,`matchQuestionId`);--> statement-breakpoint
CREATE INDEX `competition_evaluation_member_index` ON `competitionMatchEvaluations` (`memberSlot`,`evaluatedAt`);--> statement-breakpoint
CREATE INDEX `competition_result_winner_finished_index` ON `competitionMatchResults` (`winnerSlot`,`finishedAt`);--> statement-breakpoint
CREATE INDEX `competition_score_match_member_index` ON `competitionScoreLedger` (`matchId`,`memberSlot`,`createdAt`);