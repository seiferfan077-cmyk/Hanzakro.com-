CREATE TABLE `privateMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`content` mediumtext NOT NULL,
	`createdBy` enum('saif','haneen') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `privateMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `private_messages_created_index` ON `privateMessages` (`createdAt`);