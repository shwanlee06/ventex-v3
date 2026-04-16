ALTER TABLE `organizations` ADD `sessionIdleTimeoutMinutes` int DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `organizations` ADD `sessionAbsoluteTimeoutHours` int DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE `organizations` ADD `mfaEnforced` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `organizations` ADD `ipAllowlist` json;--> statement-breakpoint
ALTER TABLE `organizations` ADD `ssoEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `organizations` ADD `ssoProvider` varchar(64);--> statement-breakpoint
ALTER TABLE `organizations` ADD `ssoMetadataUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `organizations` ADD `allowedAuthMethods` json;