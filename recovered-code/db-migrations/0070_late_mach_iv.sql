ALTER TABLE `competitionEngines` ADD `questionTimeLimitSeconds` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `competitionMatchQuestions` ADD `deadlineAt` timestamp;