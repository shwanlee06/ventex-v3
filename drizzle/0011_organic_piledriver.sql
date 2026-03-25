ALTER TABLE `activity_log` ADD `activitySource` enum('atlas_ops','client_business','system') DEFAULT 'atlas_ops' NOT NULL;--> statement-breakpoint
ALTER TABLE `activity_log` ADD `activityOrgId` int;