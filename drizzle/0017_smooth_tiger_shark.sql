CREATE TABLE `client_agent_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`velocityAgentEnabled` boolean NOT NULL DEFAULT true,
	`complianceAgentEnabled` boolean NOT NULL DEFAULT true,
	`dealFlowAgentEnabled` boolean NOT NULL DEFAULT true,
	`orchestratorEnabled` boolean NOT NULL DEFAULT true,
	`overdueDaysThreshold` int NOT NULL DEFAULT 7,
	`distributionWarningDays` int NOT NULL DEFAULT 14,
	`healthScoreAlertThreshold` int NOT NULL DEFAULT 30,
	`pollingIntervalMinutes` int NOT NULL DEFAULT 30,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_agent_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agent_drafts` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `agent_events` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `ai_observations` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `audit_log` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `contacts` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `daily_briefs` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `organizations` ADD `primaryContactName` varchar(255);--> statement-breakpoint
ALTER TABLE `organizations` ADD `primaryContactEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `organizations` ADD `aumRange` varchar(32);--> statement-breakpoint
ALTER TABLE `organizations` ADD `sectors` json;--> statement-breakpoint
ALTER TABLE `organizations` ADD `subscriptionTier` varchar(32) DEFAULT 'poc';--> statement-breakpoint
ALTER TABLE `organizations` ADD `renewalDate` varchar(32);--> statement-breakpoint
ALTER TABLE `smart_alerts` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `spvs` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `tasks` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `venture_velocity` ADD `organizationId` int;