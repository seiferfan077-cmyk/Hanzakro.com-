CREATE TABLE `vocabularyProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`wordId` int NOT NULL,
	`memberSlot` enum('saif','haneen') NOT NULL,
	`correctCount` int NOT NULL DEFAULT 0,
	`wrongCount` int NOT NULL DEFAULT 0,
	`streak` int NOT NULL DEFAULT 0,
	`lastSeenAt` timestamp,
	`nextReviewAt` timestamp NOT NULL,
	`lastQuestionType` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vocabularyProgress_id` PRIMARY KEY(`id`),
	CONSTRAINT `vocabulary_progress_word_member_unique` UNIQUE(`wordId`,`memberSlot`)
);
--> statement-breakpoint
CREATE TABLE `vocabularyWords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`language` enum('english','arabic') NOT NULL,
	`word` varchar(240) NOT NULL,
	`normalizedWord` varchar(240) NOT NULL,
	`meaning` text NOT NULL,
	`pronunciation` varchar(160),
	`partOfSpeech` varchar(80),
	`sentence` text NOT NULL,
	`example` text NOT NULL,
	`relatedWordsJson` text NOT NULL,
	`subjectKey` varchar(64),
	`subjectName` varchar(120),
	`bookTitle` varchar(240),
	`unitName` varchar(180),
	`lessonTitle` varchar(240),
	`pageNumber` int,
	`sourceFileId` int,
	`status` varchar(24) NOT NULL DEFAULT 'approved',
	`createdBy` enum('saif','haneen') NOT NULL,
	`updatedBy` enum('saif','haneen') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vocabularyWords_id` PRIMARY KEY(`id`),
	CONSTRAINT `vocabulary_word_language_unique` UNIQUE(`language`,`normalizedWord`,`unitName`,`lessonTitle`)
);
--> statement-breakpoint
CREATE INDEX `vocabulary_progress_due_index` ON `vocabularyProgress` (`memberSlot`,`nextReviewAt`);--> statement-breakpoint
CREATE INDEX `vocabulary_source_index` ON `vocabularyWords` (`subjectKey`,`unitName`,`lessonTitle`);