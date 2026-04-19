CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`organizationId` int,
	`pushEnabled` boolean NOT NULL DEFAULT true,
	`emailEnabled` boolean NOT NULL DEFAULT true,
	`actionItems` boolean NOT NULL DEFAULT true,
	`distributions` boolean NOT NULL DEFAULT true,
	`stageAdvances` boolean NOT NULL DEFAULT true,
	`teamUpdates` boolean NOT NULL DEFAULT false,
	`marketSignals` boolean NOT NULL DEFAULT true,
	`agentActivity` boolean NOT NULL DEFAULT false,
	`quietHoursStart` varchar(8),
	`quietHoursEnd` varchar(8),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`)
);
