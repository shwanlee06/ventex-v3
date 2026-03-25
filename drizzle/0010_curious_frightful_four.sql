ALTER TABLE `team_members` ADD `userId` int;--> statement-breakpoint
ALTER TABLE `team_members` ADD `lastSeenAt` timestamp;--> statement-breakpoint
ALTER TABLE `team_members` ADD `adminStatus` varchar(32) DEFAULT 'active';