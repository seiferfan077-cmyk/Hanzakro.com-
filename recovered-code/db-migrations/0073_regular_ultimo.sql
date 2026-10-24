CREATE TABLE `competitionLoayRoundReviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`matchQuestionId` int NOT NULL,
	`reviewText` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competitionLoayRoundReviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `competition_loay_round_review_unique` UNIQUE(`matchQuestionId`)
);
--> statement-breakpoint
CREATE INDEX `competition_loay_review_match_question_index` ON `competitionLoayRoundReviews` (`matchId`,`matchQuestionId`);--> statement-breakpoint
CREATE INDEX `competition_loay_review_match_created_index` ON `competitionLoayRoundReviews` (`matchId`,`createdAt`);