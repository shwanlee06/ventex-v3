ALTER TABLE `invitations` MODIFY COLUMN `inviteRole` enum('viewer','client','user','partner','manager','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `invitations` ADD `teamMemberId` int;--> statement-breakpoint
ALTER TABLE `team_members` ADD `invitationStatus` varchar(32);--> statement-breakpoint
ALTER TABLE `team_members` ADD `invitationId` int;--> statement-breakpoint
ALTER TABLE `team_members` ADD `systemRole` varchar(32);