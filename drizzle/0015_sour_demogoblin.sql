CREATE TABLE `agent_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentName` varchar(64) NOT NULL,
	`eventType` varchar(32) NOT NULL,
	`message` text NOT NULL,
	`severity` varchar(16) NOT NULL,
	`entityType` varchar(32),
	`agentEntityId` varchar(64),
	`agentEntityName` varchar(255),
	`oldStatus` varchar(64),
	`newStatus` varchar(64),
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_events_id` PRIMARY KEY(`id`)
);
