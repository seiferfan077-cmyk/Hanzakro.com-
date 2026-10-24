CREATE TABLE `competitionSourceInsights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`engineId` int NOT NULL,
	`sourceId` int NOT NULL,
	`topicsJson` mediumtext NOT NULL,
	`conceptsJson` mediumtext NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competitionSourceInsights_id` PRIMARY KEY(`id`),
	CONSTRAINT `competition_source_insight_unique` UNIQUE(`sourceId`)
);
--> statement-breakpoint
CREATE INDEX `competition_source_insight_engine_index` ON `competitionSourceInsights` (`engineId`,`updatedAt`);