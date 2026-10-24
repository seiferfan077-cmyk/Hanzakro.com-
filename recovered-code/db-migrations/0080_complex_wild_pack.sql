CREATE TABLE `loayExamAttempts` (
	`id` varchar(64) NOT NULL,
	`memberSlot` enum('saif','haneen') NOT NULL,
	`title` varchar(240) NOT NULL,
	`questionsJson` mediumtext NOT NULL,
	`answersJson` mediumtext NOT NULL,
	`activeIndex` int NOT NULL DEFAULT 0,
	`status` enum('active','paused','graded','dismissed') NOT NULL DEFAULT 'active',
	`resultJson` mediumtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loayExamAttempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `loay_exam_member_status_updated_index` ON `loayExamAttempts` (`memberSlot`,`status`,`updatedAt`);