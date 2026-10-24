CREATE TABLE `vocabularyStudySessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberSlot` enum('saif','haneen') NOT NULL,
	`bookId` int NOT NULL,
	`pageFrom` int NOT NULL,
	`pageTo` int NOT NULL,
	`language` enum('english','arabic') NOT NULL,
	`extractedWordsJson` mediumtext NOT NULL,
	`currentWordIndex` int NOT NULL DEFAULT 0,
	`wordStatesJson` mediumtext NOT NULL,
	`reviewQueueJson` mediumtext NOT NULL,
	`reviewCount` int NOT NULL DEFAULT 0,
	`masteredCount` int NOT NULL DEFAULT 0,
	`status` enum('active','completed','abandoned') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `vocabularyStudySessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `vocabulary_session_member_status_index` ON `vocabularyStudySessions` (`memberSlot`,`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `vocabulary_session_book_range_index` ON `vocabularyStudySessions` (`bookId`,`pageFrom`,`pageTo`);