ALTER TABLE `client_agent_config` ADD `autoAdvanceEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `client_agent_config` ADD `autoAdvanceSectors` json;--> statement-breakpoint
ALTER TABLE `tasks` ADD `lastEmailSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `tasks` ADD `emailSentCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `venture_velocity` ADD `hoursInStage` int;--> statement-breakpoint
ALTER TABLE `venture_velocity` ADD `blockingStepsTotal` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `venture_velocity` ADD `blockingStepsCompleted` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `venture_velocity` ADD `tasksCompletedInStage` int DEFAULT 0 NOT NULL;