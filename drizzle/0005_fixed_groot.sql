CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`userName` varchar(255),
	`action` varchar(64) NOT NULL,
	`entityType` varchar(64),
	`entityId` varchar(64),
	`entityName` varchar(255),
	`details` text,
	`ipAddress` varchar(45),
	`userAgent` text,
	`result` enum('success','denied','error') NOT NULL DEFAULT 'success',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(512) NOT NULL,
	`ipAddress` varchar(45),
	`userAgent` text,
	`deviceFingerprint` varchar(128),
	`lastActivity` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_venture_access` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ventureId` int,
	`spvId` int,
	`permission` enum('view','edit','manage','full') NOT NULL DEFAULT 'view',
	`grantedBy` int,
	`grantedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `user_venture_access_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('viewer','client','user','manager','admin','owner') NOT NULL DEFAULT 'user';