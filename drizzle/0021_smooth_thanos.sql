CREATE TABLE `client_velocity_benchmarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`sector` varchar(128) NOT NULL,
	`stage` varchar(128) NOT NULL,
	`avgDaysToAdvance` int,
	`fastestDays` int,
	`slowestDays` int,
	`sampleCount` int NOT NULL DEFAULT 0,
	`lastCalculated` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_velocity_benchmarks_id` PRIMARY KEY(`id`)
);
