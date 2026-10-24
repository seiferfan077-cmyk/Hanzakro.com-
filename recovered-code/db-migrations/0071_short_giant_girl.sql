CREATE TABLE `competitionAutomaticWebResearches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`engineId` int NOT NULL,
	`sourceId` int NOT NULL,
	`query` varchar(240) NOT NULL,
	`resultsJson` text NOT NULL,
	`selectedSourceId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competitionAutomaticWebResearches_id` PRIMARY KEY(`id`),
	CONSTRAINT `competition_auto_web_source_unique` UNIQUE(`sourceId`)
);
--> statement-breakpoint
CREATE INDEX `competition_auto_web_engine_created_index` ON `competitionAutomaticWebResearches` (`engineId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `competition_auto_web_selected_source_index` ON `competitionAutomaticWebResearches` (`selectedSourceId`);