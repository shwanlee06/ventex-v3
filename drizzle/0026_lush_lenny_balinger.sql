ALTER TABLE `users` ADD `mfaSecret` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `mfaEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `mfaVerifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `mfaBackupCodes` json;