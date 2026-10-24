CREATE TABLE `competitionQuestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`engineId` int NOT NULL,
	`sourceId` int NOT NULL,
	`questionType` enum('multiple_choice','true_false','short_answer','fill_blank','definition','explain','compare','ordering') NOT NULL,
	`prompt` text NOT NULL,
	`optionsJson` mediumtext NOT NULL,
	`answerJson` mediumtext NOT NULL,
	`explanation` text NOT NULL,
	`evidenceQuote` text NOT NULL,
	`difficulty` int NOT NULL,
	`qualityJson` text NOT NULL,
	`status` enum('validated','rejected') NOT NULL DEFAULT 'validated',
	`createdBy` enum('saif','haneen') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competitionQuestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `competition_question_engine_status_index` ON `competitionQuestions` (`engineId`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `competition_question_source_index` ON `competitionQuestions` (`sourceId`,`createdAt`);