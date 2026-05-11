CREATE TABLE `passkey_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challenge` varchar(128) NOT NULL,
	`userId` int,
	`challengeType` varchar(16) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `passkey_challenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `passkey_challenges_challenge_unique` UNIQUE(`challenge`)
);
--> statement-breakpoint
CREATE TABLE `passkey_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`credentialId` varchar(512) NOT NULL,
	`publicKey` text NOT NULL,
	`counter` bigint NOT NULL DEFAULT 0,
	`deviceType` varchar(32) NOT NULL,
	`backedUp` boolean NOT NULL DEFAULT false,
	`transports` json,
	`friendlyName` varchar(255),
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	CONSTRAINT `passkey_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `passkey_credentials_credentialId_unique` UNIQUE(`credentialId`)
);
