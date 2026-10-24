CREATE TABLE `competitionEngineSources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`engineId` int NOT NULL,
	`sourceType` enum('lesson_note','study_file','text','url') NOT NULL,
	`sourceRefId` int,
	`label` varchar(300) NOT NULL,
	`sourceUrl` varchar(2048),
	`pageStart` int,
	`pageEnd` int,
	`contentSnapshot` mediumtext NOT NULL,
	`createdBy` enum('saif','haneen') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competitionEngineSources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `competitionEngines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(240) NOT NULL,
	`subjectKey` varchar(64),
	`subjectName` varchar(120),
	`gradeLevel` varchar(64),
	`unitName` varchar(180),
	`lessonTitle` varchar(240),
	`questionCount` int NOT NULL DEFAULT 8,
	`difficulty` int NOT NULL DEFAULT 2,
	`status` enum('draft','ready','archived') NOT NULL DEFAULT 'draft',
	`createdBy` enum('saif','haneen') NOT NULL,
	`updatedBy` enum('saif','haneen') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competitionEngines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `competition_source_engine_created_index` ON `competitionEngineSources` (`engineId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `competition_source_type_ref_index` ON `competitionEngineSources` (`sourceType`,`sourceRefId`);--> statement-breakpoint
CREATE INDEX `competition_engine_status_created_index` ON `competitionEngines` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `competition_engine_subject_index` ON `competitionEngines` (`subjectKey`,`updatedAt`);