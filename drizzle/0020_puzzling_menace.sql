CREATE TABLE `process_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`stageName` varchar(128) NOT NULL,
	`stepName` varchar(255) NOT NULL,
	`stepOrder` int NOT NULL DEFAULT 0,
	`stageOrder` int NOT NULL DEFAULT 0,
	`isBlocking` boolean NOT NULL DEFAULT false,
	`whoOwns` varchar(128),
	`estimatedDays` int,
	`actualAvgDays` int,
	`sampleCount` int NOT NULL DEFAULT 0,
	`evidence` text,
	`confidence` varchar(32) DEFAULT 'Medium',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `process_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `process_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`sector` varchar(128) NOT NULL,
	`blueprintName` varchar(255) NOT NULL,
	`source` varchar(64) DEFAULT 'document',
	`confidence` varchar(32) DEFAULT 'Medium',
	`sourceDocumentUrl` text,
	`sourceDocumentName` varchar(255),
	`refinementCount` int NOT NULL DEFAULT 0,
	`lastRefinedAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `process_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `venture_process_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`templateId` int NOT NULL,
	`stepId` int NOT NULL,
	`stageName` varchar(128) NOT NULL,
	`stepName` varchar(255) NOT NULL,
	`stepOrder` int NOT NULL DEFAULT 0,
	`isBlocking` boolean NOT NULL DEFAULT false,
	`whoOwns` varchar(128),
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`evidence` text,
	`confidence` varchar(32) DEFAULT 'Medium',
	`startedAt` timestamp,
	`completedAt` timestamp,
	`completedBy` varchar(128),
	`actualDays` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `venture_process_tracking_id` PRIMARY KEY(`id`)
);
