CREATE TABLE `competitionMatchRationales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`matchQuestionId` int NOT NULL,
	`authorKey` varchar(16) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competitionMatchRationales_id` PRIMARY KEY(`id`),
	CONSTRAINT `competition_rationale_round_author_unique` UNIQUE(`matchQuestionId`,`authorKey`)
);
--> statement-breakpoint
CREATE TABLE `competitionRashedTurns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`matchQuestionId` int NOT NULL,
	`answerText` text NOT NULL,
	`rationale` text,
	`behavior` enum('analysis','intentional_mistake') NOT NULL DEFAULT 'analysis',
	`outcome` enum('correct','partial','incorrect','manual_review'),
	`confidence` int,
	`awardedPoints` int NOT NULL DEFAULT 0,
	`judgeReason` text,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`evaluatedAt` timestamp,
	CONSTRAINT `competitionRashedTurns_id` PRIMARY KEY(`id`),
	CONSTRAINT `competition_rashed_turn_round_unique` UNIQUE(`matchQuestionId`)
);
--> statement-breakpoint
ALTER TABLE `competitionMatchResults` ADD `winnerKey` varchar(16);--> statement-breakpoint
ALTER TABLE `competitionMatchResults` ADD `rashedPoints` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `competitionMatches` ADD `mode` enum('duel','rashed') DEFAULT 'duel' NOT NULL;--> statement-breakpoint
CREATE INDEX `competition_rationale_match_question_index` ON `competitionMatchRationales` (`matchId`,`matchQuestionId`);--> statement-breakpoint
CREATE INDEX `competition_rationale_match_created_index` ON `competitionMatchRationales` (`matchId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `competition_rashed_turn_match_question_index` ON `competitionRashedTurns` (`matchId`,`matchQuestionId`);--> statement-breakpoint
CREATE INDEX `competition_rashed_turn_match_created_index` ON `competitionRashedTurns` (`matchId`,`submittedAt`);--> statement-breakpoint
CREATE INDEX `competition_result_winner_key_finished_index` ON `competitionMatchResults` (`winnerKey`,`finishedAt`);--> statement-breakpoint
CREATE INDEX `competition_match_mode_created_index` ON `competitionMatches` (`mode`,`createdAt`);