CREATE TABLE `compliance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`compOrgId` int,
	`compVentureId` int,
	`compSpvId` int,
	`filingType` varchar(128) NOT NULL,
	`compJurisdiction` varchar(128),
	`compDueDate` varchar(32) NOT NULL,
	`compStatus` varchar(32) NOT NULL DEFAULT 'not_started',
	`assignedTo` varchar(255),
	`assignedToId` int,
	`filedDate` varchar(32),
	`filedBy` varchar(255),
	`compNotes` text,
	`compDocUrl` text,
	`reminderSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `compliance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agent_events` ADD `aeVentureId` int;--> statement-breakpoint
ALTER TABLE `agent_events` ADD `aeSpvId` int;--> statement-breakpoint
ALTER TABLE `agent_events` ADD `aeTaskId` int;--> statement-breakpoint
ALTER TABLE `agent_events` ADD `aeDistributionId` int;--> statement-breakpoint
ALTER TABLE `agent_events` ADD `recipient` varchar(255);--> statement-breakpoint
ALTER TABLE `agent_events` ADD `outcome` varchar(64);--> statement-breakpoint
ALTER TABLE `distributions` ADD `distVentureId` int;--> statement-breakpoint
ALTER TABLE `distributions` ADD `distSpvId` int;--> statement-breakpoint
ALTER TABLE `distributions` ADD `lpRecipients` json;--> statement-breakpoint
ALTER TABLE `distributions` ADD `noticeDraftStatus` varchar(32) DEFAULT 'not_started';--> statement-breakpoint
ALTER TABLE `distributions` ADD `noticeSentDate` timestamp;--> statement-breakpoint
ALTER TABLE `distributions` ADD `principalConfirmed` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `distributions` ADD `principalConfirmedAt` timestamp;--> statement-breakpoint
ALTER TABLE `distributions` ADD `wireInstructionsOnFile` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `distributions` ADD `confirmationReceiptSent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `organizations` ADD `principalPhone` varchar(32);--> statement-breakpoint
ALTER TABLE `organizations` ADD `timezone` varchar(64) DEFAULT 'America/New_York';--> statement-breakpoint
ALTER TABLE `organizations` ADD `fiscalYearEnd` varchar(10);--> statement-breakpoint
ALTER TABLE `organizations` ADD `reportingCadence` enum('weekly','biweekly','monthly','quarterly') DEFAULT 'weekly';--> statement-breakpoint
ALTER TABLE `spv_files` ADD `sfOrgId` int;--> statement-breakpoint
ALTER TABLE `spv_files` ADD `sfCategory` varchar(64);--> statement-breakpoint
ALTER TABLE `spvs` ADD `ventureId` int;--> statement-breakpoint
ALTER TABLE `spvs` ADD `purpose` text;--> statement-breakpoint
ALTER TABLE `spvs` ADD `capitalCommitted` decimal(18,2);--> statement-breakpoint
ALTER TABLE `spvs` ADD `capitalCalled` decimal(18,2);--> statement-breakpoint
ALTER TABLE `spvs` ADD `capitalRemaining` decimal(18,2);--> statement-breakpoint
ALTER TABLE `spvs` ADD `nextCapitalCallDate` varchar(32);--> statement-breakpoint
ALTER TABLE `spvs` ADD `nextDistributionDate` varchar(32);--> statement-breakpoint
ALTER TABLE `spvs` ADD `nextDistributionAmount` decimal(18,2);--> statement-breakpoint
ALTER TABLE `spvs` ADD `legalCounsel` varchar(255);--> statement-breakpoint
ALTER TABLE `spvs` ADD `spvComplianceDeadlines` json;--> statement-breakpoint
ALTER TABLE `tasks` ADD `spvId` int;--> statement-breakpoint
ALTER TABLE `tasks` ADD `blockingReason` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `escalationContact` varchar(255);--> statement-breakpoint
ALTER TABLE `tasks` ADD `lastActionTaken` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `lastActionDate` timestamp;--> statement-breakpoint
ALTER TABLE `tasks` ADD `followUpCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `lastFollowUpSent` timestamp;--> statement-breakpoint
ALTER TABLE `team_members` ADD `memberTimezone` varchar(64);--> statement-breakpoint
ALTER TABLE `team_members` ADD `authorityLevel` enum('execute','recommend','approve') DEFAULT 'execute';--> statement-breakpoint
ALTER TABLE `team_members` ADD `escalationPriority` int DEFAULT 99;--> statement-breakpoint
ALTER TABLE `venture_files` ADD `vfOrgId` int;--> statement-breakpoint
ALTER TABLE `venture_files` ADD `vfCategory` varchar(64);--> statement-breakpoint
ALTER TABLE `ventures` ADD `organizationId` int;--> statement-breakpoint
ALTER TABLE `ventures` ADD `legalEntity` varchar(255);--> statement-breakpoint
ALTER TABLE `ventures` ADD `jurisdiction` varchar(128);--> statement-breakpoint
ALTER TABLE `ventures` ADD `dateAcquired` varchar(32);--> statement-breakpoint
ALTER TABLE `ventures` ADD `currentValuation` decimal(18,2);--> statement-breakpoint
ALTER TABLE `ventures` ADD `equityOwned` decimal(5,2);--> statement-breakpoint
ALTER TABLE `ventures` ADD `keyContact` varchar(255);--> statement-breakpoint
ALTER TABLE `ventures` ADD `nextMilestoneDate` varchar(32);--> statement-breakpoint
ALTER TABLE `ventures` ADD `lastActivityDate` timestamp;--> statement-breakpoint
ALTER TABLE `ventures` ADD `daysInCurrentStage` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `ventures` ADD `complianceDeadlines` json;--> statement-breakpoint
ALTER TABLE `ventures` ADD `openDeals` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `ventures` ADD `lastDistributionDate` varchar(32);--> statement-breakpoint
ALTER TABLE `ventures` ADD `nextDistributionDate` varchar(32);--> statement-breakpoint
ALTER TABLE `ventures` ADD `nextDistributionAmount` decimal(18,2);--> statement-breakpoint
ALTER TABLE `ventures` ADD `ventureNotes` text;--> statement-breakpoint
ALTER TABLE `ventures` ADD `flags` json;