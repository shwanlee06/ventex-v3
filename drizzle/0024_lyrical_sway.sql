ALTER TABLE `process_steps` MODIFY COLUMN `whoOwns` varchar(255);--> statement-breakpoint
ALTER TABLE `process_steps` ADD `stageDescription` text;--> statement-breakpoint
ALTER TABLE `process_steps` ADD `stageTypicalDurationDays` int;--> statement-breakpoint
ALTER TABLE `process_steps` ADD `decisionMaker` varchar(255);--> statement-breakpoint
ALTER TABLE `process_steps` ADD `approvalThreshold` text;--> statement-breakpoint
ALTER TABLE `process_steps` ADD `stepDescription` text;--> statement-breakpoint
ALTER TABLE `process_steps` ADD `typicalDays` int;--> statement-breakpoint
ALTER TABLE `process_steps` ADD `documentOrOutput` varchar(500);--> statement-breakpoint
ALTER TABLE `process_steps` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `process_steps` DROP COLUMN `estimatedDays`;--> statement-breakpoint
ALTER TABLE `process_steps` DROP COLUMN `evidence`;--> statement-breakpoint
ALTER TABLE `process_steps` DROP COLUMN `confidence`;