ALTER TABLE `users` MODIFY COLUMN `role` enum('viewer','client','user','partner','manager','admin','owner') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `team_members` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `team_members` ADD `sortOrder` int DEFAULT 100;