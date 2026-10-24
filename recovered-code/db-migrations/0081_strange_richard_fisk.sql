CREATE TABLE `platformLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(240) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`host` varchar(255) NOT NULL,
	`description` varchar(600) NOT NULL DEFAULT '',
	`accentColor` varchar(24) NOT NULL DEFAULT '#315f4d',
	`createdBy` enum('saif','haneen') NOT NULL,
	`updatedBy` enum('saif','haneen') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platformLinks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platformVideoNotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`videoId` int NOT NULL,
	`atSeconds` int NOT NULL DEFAULT 0,
	`note` text NOT NULL,
	`createdBy` enum('saif','haneen') NOT NULL,
	`updatedBy` enum('saif','haneen') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platformVideoNotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platformVideos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`platformLinkId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`sourceUrl` varchar(2048) NOT NULL,
	`kind` enum('youtube','direct','embed') NOT NULL,
	`videoId` varchar(32),
	`embedUrl` varchar(2048),
	`thumbnailUrl` varchar(2048),
	`allowDownload` boolean NOT NULL DEFAULT false,
	`downloadNote` varchar(300) NOT NULL DEFAULT 'المصدر الخارجي لا يتيح تنزيل الملف من داخل المنصة.',
	`createdBy` enum('saif','haneen') NOT NULL,
	`updatedBy` enum('saif','haneen') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platformVideos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `platform_link_created_index` ON `platformLinks` (`createdAt`);--> statement-breakpoint
CREATE INDEX `platform_link_host_index` ON `platformLinks` (`host`);--> statement-breakpoint
CREATE INDEX `platform_video_note_time_index` ON `platformVideoNotes` (`videoId`,`atSeconds`);--> statement-breakpoint
CREATE INDEX `platform_video_note_created_index` ON `platformVideoNotes` (`createdAt`);--> statement-breakpoint
CREATE INDEX `platform_video_link_created_index` ON `platformVideos` (`platformLinkId`,`createdAt`);