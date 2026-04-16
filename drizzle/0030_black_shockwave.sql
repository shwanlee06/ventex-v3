CREATE TABLE `distribution_read_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`distributionId` int NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(255) NOT NULL,
	`organizationId` int,
	`readAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `distribution_read_receipts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_downloads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileId` int NOT NULL,
	`ventureId` int NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(255) NOT NULL,
	`userRole` varchar(32) NOT NULL,
	`organizationId` int,
	`ipAddress` varchar(64),
	`userAgent` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `document_downloads_id` PRIMARY KEY(`id`)
);
