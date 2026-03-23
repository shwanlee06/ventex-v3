CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int NOT NULL,
	`keyHash` varchar(128) NOT NULL,
	`keyPrefix` varchar(12) NOT NULL,
	`label` varchar(255),
	`ventureIds` json,
	`keyStatus` enum('active','revoked') NOT NULL DEFAULT 'active',
	`lastUsedAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_keys_keyHash_unique` UNIQUE(`keyHash`)
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`organizationId` int NOT NULL,
	`inviteRole` enum('viewer','client','user','manager','admin') NOT NULL DEFAULT 'user',
	`token` varchar(128) NOT NULL,
	`inviteStatus` enum('pending','accepted','expired','revoked') NOT NULL DEFAULT 'pending',
	`ventureIds` json,
	`invitedBy` int NOT NULL,
	`invitedByName` varchar(255),
	`acceptedAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `org_venture_access` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`ventureId` int NOT NULL,
	`orgPermission` enum('view','edit','manage','full') NOT NULL DEFAULT 'view',
	`grantedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `org_venture_access_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(128) NOT NULL,
	`type` enum('core','partner','client') NOT NULL DEFAULT 'partner',
	`orgStatus` enum('active','suspended','archived') NOT NULL DEFAULT 'active',
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_name_unique` UNIQUE(`name`),
	CONSTRAINT `organizations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `userStatus` enum('active','pending','suspended','blocked') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `invitationId` int;