CREATE TABLE `league` (
	`caster_mode` text DEFAULT 'optional' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`current_units` integer DEFAULT 0 NOT NULL,
	`current_week` integer DEFAULT 0 NOT NULL,
	`entry_fee_cents` integer DEFAULT 0 NOT NULL,
	`flight_number` integer,
	`format` text NOT NULL,
	`host_user_id` text,
	`id` text PRIMARY KEY NOT NULL,
	`is_video_league` integer DEFAULT true NOT NULL,
	`location_label` text NOT NULL,
	`match_window_days` integer DEFAULT 7 NOT NULL,
	`max_units` integer NOT NULL,
	`name` text NOT NULL,
	`program_id` text,
	`registration_mode` text DEFAULT 'direct' NOT NULL,
	`season_weeks` integer NOT NULL,
	`start_trigger` text DEFAULT 'on_full' NOT NULL,
	`started_at` integer,
	`status` text DEFAULT 'recruiting' NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`workflow_instance_id` text,
	FOREIGN KEY (`host_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`program_id`) REFERENCES `league_program`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `league_host_status_idx` ON `league` (`host_user_id`,`status`);--> statement-breakpoint
CREATE INDEX `league_program_status_idx` ON `league` (`program_id`,`status`);--> statement-breakpoint
CREATE TABLE `league_matchup` (
	`away_team_id` text NOT NULL,
	`caster_user_id` text,
	`due_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`home_team_id` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`league_id` text NOT NULL,
	`score_summary` text,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`video_asset_id` text,
	`video_playback_url` text,
	`week_number` integer NOT NULL,
	`winner_team_id` text,
	FOREIGN KEY (`away_team_id`) REFERENCES `league_team`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`caster_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`home_team_id`) REFERENCES `league_team`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`league_id`) REFERENCES `league`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`video_asset_id`) REFERENCES `video`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`winner_team_id`) REFERENCES `league_team`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `league_matchup_league_week_idx` ON `league_matchup` (`league_id`,`week_number`);--> statement-breakpoint
CREATE INDEX `league_matchup_due_at_idx` ON `league_matchup` (`due_at`);--> statement-breakpoint
CREATE TABLE `league_matchup_subgame` (
	`id` text PRIMARY KEY NOT NULL,
	`matchup_id` text NOT NULL,
	`point_weight` integer DEFAULT 1 NOT NULL,
	`score_text` text,
	`slot_type` text NOT NULL,
	`video_asset_id` text,
	`winner_team_id` text,
	FOREIGN KEY (`matchup_id`) REFERENCES `league_matchup`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`video_asset_id`) REFERENCES `video`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`winner_team_id`) REFERENCES `league_team`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `league_matchup_subgame_matchup_idx` ON `league_matchup_subgame` (`matchup_id`);--> statement-breakpoint
CREATE TABLE `league_post` (
	`author_user_id` text,
	`body_copy` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`league_id` text NOT NULL,
	`matchup_id` text,
	`post_type` text NOT NULL,
	`video_playback_url` text,
	FOREIGN KEY (`author_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`league_id`) REFERENCES `league`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`matchup_id`) REFERENCES `league_matchup`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `league_post_league_created_idx` ON `league_post` (`league_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `league_program` (
	`cohort_target_units` integer DEFAULT 8 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`entry_fee_cents` integer DEFAULT 0 NOT NULL,
	`flight_weeks` integer DEFAULT 6 NOT NULL,
	`format` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`region_name` text NOT NULL,
	`season` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`year` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `league_program_active_idx` ON `league_program` (`is_active`);--> statement-breakpoint
CREATE INDEX `league_program_region_idx` ON `league_program` (`region_name`,`year`);--> statement-breakpoint
CREATE TABLE `league_program_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`joined_queue_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`partner_user_id` text,
	`program_id` text NOT NULL,
	`skill_rating` integer,
	`user_id` text NOT NULL,
	FOREIGN KEY (`partner_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`program_id`) REFERENCES `league_program`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `league_program_queue_program_idx` ON `league_program_queue` (`program_id`,`joined_queue_at`);--> statement-breakpoint
CREATE INDEX `league_program_queue_user_idx` ON `league_program_queue` (`user_id`);--> statement-breakpoint
CREATE TABLE `league_roster_member` (
	`display_name` text NOT NULL,
	`draft_pick_number` integer,
	`id` text PRIMARY KEY NOT NULL,
	`league_id` text NOT NULL,
	`payment_status` text NOT NULL,
	`squad_line` text DEFAULT 'STARTER' NOT NULL,
	`team_id` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`league_id`) REFERENCES `league`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_id`) REFERENCES `league_team`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `league_roster_member_league_idx` ON `league_roster_member` (`league_id`);--> statement-breakpoint
CREATE INDEX `league_roster_member_team_idx` ON `league_roster_member` (`team_id`);--> statement-breakpoint
CREATE INDEX `league_roster_member_user_idx` ON `league_roster_member` (`user_id`);--> statement-breakpoint
CREATE TABLE `league_team` (
	`captain_user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`league_id` text NOT NULL,
	`matches_lost` integer DEFAULT 0 NOT NULL,
	`matches_won` integer DEFAULT 0 NOT NULL,
	`name` text NOT NULL,
	`points_diff` integer DEFAULT 0 NOT NULL,
	`team_points` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`captain_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`league_id`) REFERENCES `league`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `league_team_league_idx` ON `league_team` (`league_id`);