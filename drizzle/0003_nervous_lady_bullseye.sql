CREATE TABLE `ai_observations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`observationType` varchar(64) NOT NULL,
	`ventureId` int,
	`ventureName` varchar(255),
	`observation` text NOT NULL,
	`recommendedAction` text,
	`suggestedTaskTitle` varchar(500),
	`suggestedAssignee` varchar(255),
	`suggestedDueDays` int,
	`dismissed` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_observations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_briefs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`briefDate` varchar(16) NOT NULL,
	`headline` varchar(500),
	`priorityItems` json,
	`portfolioHealth` varchar(32),
	`recommendedActions` json,
	`winsThisWeek` json,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_briefs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `document_intelligence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileId` int NOT NULL,
	`ventureId` int,
	`spvId` int,
	`documentType` varchar(64),
	`summary` text,
	`sentiment` varchar(32),
	`keyEntities` json,
	`keyFinancialFigures` json,
	`actionItems` json,
	`deadlines` json,
	`risksMentioned` json,
	`rawText` text,
	`processingStatus` varchar(32) NOT NULL DEFAULT 'pending',
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `document_intelligence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meeting_briefs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileId` int NOT NULL,
	`ventureId` int,
	`meetingDate` varchar(32),
	`attendees` json,
	`keyDecisions` json,
	`actionItems` json,
	`nextMeetingDate` varchar(32),
	`headline` varchar(500),
	`summary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meeting_briefs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `smart_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`severity` varchar(16) NOT NULL,
	`alertType` varchar(64) NOT NULL,
	`message` text NOT NULL,
	`entityType` varchar(64),
	`entityId` int,
	`entityName` varchar(255),
	`actionUrl` varchar(500),
	`dismissed` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `smart_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `venture_risks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ventureId` int NOT NULL,
	`riskDescription` text NOT NULL,
	`sourceFileId` int,
	`status` varchar(32) NOT NULL DEFAULT 'Monitoring',
	`identifiedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `venture_risks_id` PRIMARY KEY(`id`)
);
