CREATE TABLE `spv_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`spvId` int NOT NULL,
	`folderId` int,
	`filename` varchar(500) NOT NULL,
	`fileType` varchar(128),
	`fileSize` bigint,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(500),
	`uploadedBy` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `spv_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spv_folders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`spvId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`color` varchar(32) DEFAULT 'blue',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `spv_folders_id` PRIMARY KEY(`id`)
);
