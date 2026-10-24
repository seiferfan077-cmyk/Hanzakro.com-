ALTER TABLE `studyFiles` ADD `isFavorite` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `study_file_favorite_created_index` ON `studyFiles` (`isFavorite`,`createdAt`);