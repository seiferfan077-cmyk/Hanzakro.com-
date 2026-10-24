ALTER TABLE `privateMessages` ADD `attachmentKey` varchar(512);--> statement-breakpoint
ALTER TABLE `privateMessages` ADD `attachmentUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `privateMessages` ADD `attachmentName` varchar(255);--> statement-breakpoint
ALTER TABLE `privateMessages` ADD `attachmentMime` varchar(120);--> statement-breakpoint
ALTER TABLE `privateMessages` ADD `attachmentSize` int;
