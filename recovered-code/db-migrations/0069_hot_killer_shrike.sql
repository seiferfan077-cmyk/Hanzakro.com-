ALTER TABLE `competitionMatchEvaluations` ADD `reviewProposedOutcome` enum('correct','partial','incorrect','manual_review');--> statement-breakpoint
ALTER TABLE `competitionMatchEvaluations` ADD `reviewProposedBy` enum('saif','haneen');--> statement-breakpoint
ALTER TABLE `competitionMatchEvaluations` ADD `reviewConfirmedBy` enum('saif','haneen');--> statement-breakpoint
ALTER TABLE `competitionMatchEvaluations` ADD `reviewNote` varchar(1200);--> statement-breakpoint
ALTER TABLE `competitionMatchEvaluations` ADD `reviewProposedAt` timestamp;--> statement-breakpoint
ALTER TABLE `competitionMatchEvaluations` ADD `reviewResolvedAt` timestamp;