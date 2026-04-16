CREATE TABLE `agent_approval_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(16) NOT NULL,
	`entityId` int NOT NULL,
	`action` varchar(16) NOT NULL,
	`actorId` int,
	`actorName` varchar(255) NOT NULL,
	`originalContent` text,
	`finalContent` text,
	`reason` text,
	`confidenceScore` int,
	`disclaimerApplied` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_approval_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_eval_dataset` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentName` varchar(64) NOT NULL,
	`testCaseName` varchar(255) NOT NULL,
	`inputContext` json NOT NULL,
	`expectedOutput` json NOT NULL,
	`actualOutput` json,
	`graderScore` int,
	`graderNotes` text,
	`lastRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_eval_dataset_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agent_drafts` ADD `humanApprovalRequired` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `agent_drafts` ADD `approvalStatus` varchar(16) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `agent_drafts` ADD `approvedBy` varchar(255);--> statement-breakpoint
ALTER TABLE `agent_drafts` ADD `approvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `agent_drafts` ADD `rejectionReason` text;--> statement-breakpoint
ALTER TABLE `agent_drafts` ADD `confidenceScore` int;--> statement-breakpoint
ALTER TABLE `agent_drafts` ADD `disclaimer` text;--> statement-breakpoint
ALTER TABLE `agent_events` ADD `humanApprovalRequired` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `agent_events` ADD `approvalStatus` varchar(16) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `agent_events` ADD `approvedBy` varchar(255);--> statement-breakpoint
ALTER TABLE `agent_events` ADD `approvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `agent_events` ADD `rejectionReason` text;--> statement-breakpoint
ALTER TABLE `agent_events` ADD `confidenceScore` int;--> statement-breakpoint
ALTER TABLE `agent_events` ADD `disclaimer` text;