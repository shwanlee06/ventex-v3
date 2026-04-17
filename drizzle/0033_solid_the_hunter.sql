ALTER TABLE `organizations` ADD `entityType` varchar(32);--> statement-breakpoint
ALTER TABLE `organizations` ADD `parentOrgId` int;--> statement-breakpoint
ALTER TABLE `organizations` ADD `jurisdiction` varchar(128);--> statement-breakpoint
ALTER TABLE `organizations` ADD `registrationNumber` varchar(128);--> statement-breakpoint
ALTER TABLE `organizations` ADD `dataResidencyRegion` varchar(32) DEFAULT 'us-east-1';--> statement-breakpoint
ALTER TABLE `ventures` ADD `operatingEntityId` int;--> statement-breakpoint
ALTER TABLE `ventures` ADD `legalStructure` varchar(64);