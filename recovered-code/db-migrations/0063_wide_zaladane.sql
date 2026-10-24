CREATE TABLE `competitionMatchAnswers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`matchQuestionId` int NOT NULL,
	`memberSlot` enum('saif','haneen') NOT NULL,
	`answerText` text NOT NULL,
	`idempotencyKey` varchar(96) NOT NULL,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competitionMatchAnswers_id` PRIMARY KEY(`id`),
	CONSTRAINT `competition_match_answer_member_unique` UNIQUE(`matchQuestionId`,`memberSlot`),
	CONSTRAINT `competition_match_answer_idempotency_unique` UNIQUE(`matchId`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `competitionMatchPlayers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`memberSlot` enum('saif','haneen') NOT NULL,
	`state` enum('invited','joined','ready','disconnected','finished') NOT NULL DEFAULT 'invited',
	`joinedAt` timestamp,
	`readyAt` timestamp,
	`lastSeenAt` timestamp,
	`disconnectedAt` timestamp,
	CONSTRAINT `competitionMatchPlayers_id` PRIMARY KEY(`id`),
	CONSTRAINT `competition_match_player_unique` UNIQUE(`matchId`,`memberSlot`)
);
--> statement-breakpoint
CREATE TABLE `competitionMatchQuestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`questionId` int NOT NULL,
	`questionOrder` int NOT NULL,
	`status` enum('pending','active','answered','evaluated') NOT NULL DEFAULT 'pending',
	`activatedAt` timestamp,
	`answeredAt` timestamp,
	`evaluatedAt` timestamp,
	CONSTRAINT `competitionMatchQuestions_id` PRIMARY KEY(`id`),
	CONSTRAINT `competition_match_question_order_unique` UNIQUE(`matchId`,`questionOrder`),
	CONSTRAINT `competition_match_question_source_unique` UNIQUE(`matchId`,`questionId`)
);
--> statement-breakpoint
CREATE TABLE `competitionMatches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`engineId` int NOT NULL,
	`status` enum('waiting','ready','question_active','evaluating','showing_result','finished','cancelled') NOT NULL DEFAULT 'waiting',
	`currentQuestionOrder` int NOT NULL DEFAULT 0,
	`stateVersion` int NOT NULL DEFAULT 1,
	`createdBy` enum('saif','haneen') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`finishedAt` timestamp,
	CONSTRAINT `competitionMatches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `competition_match_answer_question_index` ON `competitionMatchAnswers` (`matchQuestionId`,`submittedAt`);--> statement-breakpoint
CREATE INDEX `competition_match_player_match_state_index` ON `competitionMatchPlayers` (`matchId`,`state`);--> statement-breakpoint
CREATE INDEX `competition_match_question_match_status_index` ON `competitionMatchQuestions` (`matchId`,`status`);--> statement-breakpoint
CREATE INDEX `competition_match_status_created_index` ON `competitionMatches` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `competition_match_engine_status_index` ON `competitionMatches` (`engineId`,`status`);