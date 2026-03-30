ALTER TABLE `agent_events` ADD `audience` varchar(16) DEFAULT 'operator' NOT NULL;--> statement-breakpoint
ALTER TABLE `agent_events` ADD `requiresClientAction` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `agent_events` ADD `clientDismissed` boolean DEFAULT false NOT NULL;