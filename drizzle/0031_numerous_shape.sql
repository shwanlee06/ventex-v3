CREATE TABLE `fx_rates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`baseCurrency` varchar(8) NOT NULL DEFAULT 'USD',
	`targetCurrency` varchar(8) NOT NULL,
	`rate` double NOT NULL,
	`inverseRate` double NOT NULL,
	`source` varchar(64) DEFAULT 'manual',
	`effectiveDate` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fx_rates_id` PRIMARY KEY(`id`)
);
