ALTER TABLE `notifications` ADD `notifOrgId` int;--> statement-breakpoint
ALTER TABLE `notifications` ADD `notifCategory` varchar(32) DEFAULT 'info' NOT NULL;--> statement-breakpoint
ALTER TABLE `notifications` ADD `notifEntityName` varchar(255);--> statement-breakpoint
ALTER TABLE `notifications` ADD `notifLink` varchar(500);--> statement-breakpoint
ALTER TABLE `notifications` ADD `actorName` varchar(255);