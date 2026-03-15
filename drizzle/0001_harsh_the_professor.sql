CREATE TABLE `activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int,
	`entityName` varchar(255),
	`action` varchar(255) NOT NULL,
	`detail` text,
	`userName` varchar(255),
	`sector` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`legacyId` varchar(64),
	`name` varchar(255) NOT NULL,
	`role` varchar(255),
	`status` varchar(64) DEFAULT 'Active',
	`industries` json,
	`geography` varchar(128),
	`slug` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `contacts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `distributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`legacyId` varchar(64),
	`name` varchar(255) NOT NULL,
	`fund` varchar(255),
	`amount` bigint NOT NULL DEFAULT 0,
	`currency` varchar(8) DEFAULT 'USD',
	`type` varchar(64),
	`status` varchar(32) DEFAULT 'Scheduled',
	`method` varchar(64),
	`notes` text,
	`distributionDate` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `distributions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`type` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`entityType` varchar(64),
	`entityId` int,
	`isRead` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spv_team` (
	`id` int AUTO_INCREMENT NOT NULL,
	`spvId` int NOT NULL,
	`memberId` int NOT NULL,
	`responsibility` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `spv_team_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spv_ventures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`spvId` int NOT NULL,
	`ventureId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `spv_ventures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spvs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`legacyId` varchar(64),
	`name` varchar(255) NOT NULL,
	`sector` varchar(64),
	`priority` varchar(32) DEFAULT 'Medium',
	`stage` varchar(64) DEFAULT 'Active deal',
	`notes` text,
	`currentStatus` text,
	`nextStep` text,
	`slug` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spvs_id` PRIMARY KEY(`id`),
	CONSTRAINT `spvs_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`legacyId` varchar(64),
	`title` varchar(500) NOT NULL,
	`ventureId` int,
	`ventureLink` varchar(255),
	`assigneeIds` json,
	`assigneeNames` json,
	`dueDate` varchar(32),
	`priority` varchar(32) DEFAULT 'Medium',
	`status` varchar(32) NOT NULL DEFAULT 'open',
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`legacyId` varchar(64),
	`name` varchar(255) NOT NULL,
	`role` varchar(128),
	`memberFunction` varchar(128),
	`status` varchar(64) DEFAULT 'Active',
	`type` varchar(64) DEFAULT 'Internal',
	`notes` text,
	`email` varchar(320),
	`phone` varchar(64),
	`telegram` varchar(128),
	`whatsapp` varchar(64),
	`linkedin` varchar(255),
	`location` varchar(128),
	`photoUrl` text,
	`slug` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `team_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `team_members_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `venture_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`folderId` int,
	`filename` varchar(500) NOT NULL,
	`fileType` varchar(128),
	`fileSize` bigint,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500),
	`uploadedBy` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `venture_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `venture_folders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`color` varchar(32) DEFAULT 'blue',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `venture_folders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `venture_team` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`memberId` int NOT NULL,
	`responsibility` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `venture_team_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ventures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`legacyId` varchar(64),
	`name` varchar(255) NOT NULL,
	`sector` varchar(64) NOT NULL,
	`location` varchar(128) NOT NULL DEFAULT 'TBD',
	`stage` varchar(64) NOT NULL DEFAULT 'In Validation',
	`status` varchar(64) NOT NULL DEFAULT 'In progress',
	`description` text,
	`currentStatus` text,
	`nextStep` text,
	`nextMilestone` varchar(32),
	`priority` varchar(32) DEFAULT 'Medium',
	`slug` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ventures_id` PRIMARY KEY(`id`),
	CONSTRAINT `ventures_slug_unique` UNIQUE(`slug`)
);
