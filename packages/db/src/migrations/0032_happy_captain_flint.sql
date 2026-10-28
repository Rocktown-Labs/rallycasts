CREATE TABLE `creator_follow` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`creator_user_id` text NOT NULL,
	`follower_user_id` text NOT NULL,
	FOREIGN KEY (`creator_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`follower_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `creator_follow_pair_idx` ON `creator_follow` (`follower_user_id`,`creator_user_id`);--> statement-breakpoint
CREATE INDEX `creator_follow_creator_idx` ON `creator_follow` (`creator_user_id`);--> statement-breakpoint
CREATE INDEX `creator_follow_follower_idx` ON `creator_follow` (`follower_user_id`);--> statement-breakpoint
CREATE TABLE `live_stream` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`description` text,
	`ended_at` integer,
	`event_id` text,
	`id` text PRIMARY KEY NOT NULL,
	`latency_mode` text DEFAULT 'low' NOT NULL,
	`mux_live_stream_id` text NOT NULL,
	`mux_playback_id` text,
	`mux_stream_key` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`recording_asset_id` text,
	`recording_video_id` text,
	`started_at` integer,
	`status` text DEFAULT 'idle' NOT NULL,
	`title` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recording_video_id`) REFERENCES `video`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `live_stream_mux_id_idx` ON `live_stream` (`mux_live_stream_id`);--> statement-breakpoint
CREATE INDEX `live_stream_owner_idx` ON `live_stream` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `live_stream_status_idx` ON `live_stream` (`status`);--> statement-breakpoint
CREATE INDEX `live_stream_event_idx` ON `live_stream` (`event_id`);--> statement-breakpoint
CREATE TABLE `push_receipt` (
	`checked_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`error_code` text,
	`id` text PRIMARY KEY NOT NULL,
	`push_token_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`ticket_id` text NOT NULL,
	`user_id` text,
	FOREIGN KEY (`push_token_id`) REFERENCES `push_token`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `push_receipt_status_idx` ON `push_receipt` (`status`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `push_receipt_ticket_idx` ON `push_receipt` (`ticket_id`);--> statement-breakpoint
CREATE TABLE `push_token` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`device_id` text,
	`disabled_at` integer,
	`id` text PRIMARY KEY NOT NULL,
	`last_seen_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`platform` text DEFAULT 'unknown' NOT NULL,
	`token` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_token_token_idx` ON `push_token` (`token`);--> statement-breakpoint
CREATE INDEX `push_token_user_idx` ON `push_token` (`user_id`);--> statement-breakpoint
CREATE TABLE `video_view` (
	`completed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`video_id` text NOT NULL,
	`watched_seconds` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `video_view_video_created_idx` ON `video_view` (`video_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `video_view_created_idx` ON `video_view` (`created_at`);--> statement-breakpoint
CREATE INDEX `video_view_user_idx` ON `video_view` (`user_id`);--> statement-breakpoint
ALTER TABLE `video` ADD `view_count` integer DEFAULT 0 NOT NULL;