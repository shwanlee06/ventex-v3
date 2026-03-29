CREATE TABLE `agent_drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int,
	`ventureName` varchar(255),
	`draftType` varchar(32) NOT NULL,
	`subject` varchar(500),
	`body` text NOT NULL,
	`recipientName` varchar(255),
	`recipientRole` varchar(128),
	`draftStatus` varchar(16) NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`sentBy` varchar(255),
	`createdByAgent` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_drafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `venture_velocity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`ventureName` varchar(255) NOT NULL,
	`sector` varchar(64),
	`fromStage` varchar(64) NOT NULL,
	`toStage` varchar(64) NOT NULL,
	`daysInStage` int NOT NULL,
	`advancedBy` varchar(128),
	`advancedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `venture_velocity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agent_events` ADD `actionType` varchar(32);--> statement-breakpoint
ALTER TABLE `agent_events` ADD `actionLabel` varchar(128);--> statement-breakpoint
ALTER TABLE `agent_events` ADD `actionPayload` json;--> statement-breakpoint
ALTER TABLE `agent_events` ADD `actionTaken` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `agent_events` ADD `actionTakenAt` timestamp;--> statement-breakpoint
ALTER TABLE `agent_events` ADD `actionTakenBy` varchar(255);