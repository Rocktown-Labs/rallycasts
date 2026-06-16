CREATE TABLE `event_match` (
	`court_label` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`event_id` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`player_one_score` integer,
	`player_one_user_id` text,
	`player_two_score` integer,
	`player_two_user_id` text,
	`round` integer NOT NULL,
	`scheduled_at` integer,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`winner_user_id` text,
	FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_one_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`player_two_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`winner_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `event_match_event_round_idx` ON `event_match` (`event_id`,`round`);--> statement-breakpoint
CREATE INDEX `event_match_player_one_idx` ON `event_match` (`player_one_user_id`);--> statement-breakpoint
CREATE INDEX `event_match_player_two_idx` ON `event_match` (`player_two_user_id`);--> statement-breakpoint
CREATE INDEX `event_match_winner_idx` ON `event_match` (`winner_user_id`);--> statement-breakpoint
CREATE TABLE `event_registration` (
	`checked_in_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`event_id` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`seed` integer,
	`status` text DEFAULT 'registered' NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_registration_event_user_idx` ON `event_registration` (`event_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `event_registration_event_status_idx` ON `event_registration` (`event_id`,`status`);--> statement-breakpoint
CREATE INDEX `event_registration_user_idx` ON `event_registration` (`user_id`);