CREATE TABLE `caster_availability` (
	`id` text PRIMARY KEY NOT NULL,
	`caster_user_id` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`latitude` real,
	`longitude` real,
	`status` text DEFAULT 'available' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`caster_user_id`) REFERENCES `caster_profile`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `caster_availability_caster_idx` ON `caster_availability` (`caster_user_id`);--> statement-breakpoint
CREATE INDEX `caster_availability_window_idx` ON `caster_availability` (`starts_at`,`ends_at`);--> statement-breakpoint
CREATE TABLE `caster_profile` (
	`user_id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`display_name` text,
	`bio` text,
	`hourly_rate_cents` integer DEFAULT 0 NOT NULL,
	`service_radius_miles` integer DEFAULT 25 NOT NULL,
	`base_latitude` real,
	`base_longitude` real,
	`stripe_connect_account_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `caster_profile_status_idx` ON `caster_profile` (`status`);--> statement-breakpoint
CREATE INDEX `caster_profile_location_idx` ON `caster_profile` (`base_latitude`,`base_longitude`);--> statement-breakpoint
CREATE TABLE `casting_job` (
	`id` text PRIMARY KEY NOT NULL,
	`requester_user_id` text NOT NULL,
	`caster_user_id` text,
	`challenge_id` text,
	`venue_id` text,
	`status` text DEFAULT 'requested' NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer,
	`requested_hours` real NOT NULL,
	`price_cents` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`stripe_payment_intent_id` text,
	`notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`requester_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`caster_user_id`) REFERENCES `caster_profile`(`user_id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenge`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`venue_id`) REFERENCES `venue`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `casting_job_requester_idx` ON `casting_job` (`requester_user_id`);--> statement-breakpoint
CREATE INDEX `casting_job_caster_idx` ON `casting_job` (`caster_user_id`);--> statement-breakpoint
CREATE INDEX `casting_job_status_idx` ON `casting_job` (`status`);--> statement-breakpoint
CREATE INDEX `casting_job_window_idx` ON `casting_job` (`starts_at`,`ends_at`);--> statement-breakpoint
CREATE TABLE `casting_job_offer` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`caster_user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`distance_miles` real,
	`expires_at` integer,
	`responded_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `casting_job`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`caster_user_id`) REFERENCES `caster_profile`(`user_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `casting_job_offer_job_caster_idx` ON `casting_job_offer` (`job_id`,`caster_user_id`);--> statement-breakpoint
CREATE INDEX `casting_job_offer_status_idx` ON `casting_job_offer` (`status`);--> statement-breakpoint
CREATE TABLE `challenge` (
	`id` text PRIMARY KEY NOT NULL,
	`challenger_user_id` text NOT NULL,
	`challenged_user_id` text,
	`venue_id` text,
	`status` text DEFAULT 'issued' NOT NULL,
	`message` text,
	`scheduled_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`challenger_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`challenged_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`venue_id`) REFERENCES `venue`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `challenge_challenger_idx` ON `challenge` (`challenger_user_id`);--> statement-breakpoint
CREATE INDEX `challenge_challenged_idx` ON `challenge` (`challenged_user_id`);--> statement-breakpoint
CREATE INDEX `challenge_status_idx` ON `challenge` (`status`);--> statement-breakpoint
CREATE TABLE `conversation` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text DEFAULT 'direct' NOT NULL,
	`casting_job_id` text,
	`challenge_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`casting_job_id`) REFERENCES `casting_job`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`challenge_id`) REFERENCES `challenge`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `conversation_participant` (
	`conversation_id` text NOT NULL,
	`user_id` text NOT NULL,
	`last_read_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversation`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_participant_pk` ON `conversation_participant` (`conversation_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `conversation_participant_user_idx` ON `conversation_participant` (`user_id`);--> statement-breakpoint
CREATE TABLE `event` (
	`id` text PRIMARY KEY NOT NULL,
	`organizer_user_id` text NOT NULL,
	`venue_id` text,
	`name` text NOT NULL,
	`description` text,
	`event_type` text DEFAULT 'open_play' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer,
	`capacity` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organizer_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`venue_id`) REFERENCES `venue`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `event_starts_at_idx` ON `event` (`starts_at`);--> statement-breakpoint
CREATE INDEX `event_venue_idx` ON `event` (`venue_id`);--> statement-breakpoint
CREATE INDEX `event_organizer_idx` ON `event` (`organizer_user_id`);--> statement-breakpoint
CREATE TABLE `message` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`sender_user_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`edited_at` integer,
	`deleted_at` integer,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversation`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `message_conversation_created_idx` ON `message` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `message_sender_idx` ON `message` (`sender_user_id`);--> statement-breakpoint
CREATE TABLE `user_profile` (
	`user_id` text PRIMARY KEY NOT NULL,
	`bio` text,
	`account_tier` text DEFAULT 'free' NOT NULL,
	`onboarding_status` text DEFAULT 'pending' NOT NULL,
	`is_player` integer DEFAULT true NOT NULL,
	`is_caster` integer DEFAULT false NOT NULL,
	`is_organizer` integer DEFAULT false NOT NULL,
	`skill_level` text,
	`home_city` text,
	`home_state` text,
	`home_country` text DEFAULT 'US',
	`home_latitude` real,
	`home_longitude` real,
	`radar_place_id` text,
	`radar_address_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_profile_account_tier_idx` ON `user_profile` (`account_tier`);--> statement-breakpoint
CREATE INDEX `user_profile_home_location_idx` ON `user_profile` (`home_latitude`,`home_longitude`);--> statement-breakpoint
CREATE TABLE `venue` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`venue_type` text DEFAULT 'park' NOT NULL,
	`address_line_1` text,
	`address_line_2` text,
	`city` text,
	`state` text,
	`country` text DEFAULT 'US',
	`postal_code` text,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`radar_place_id` text,
	`google_place_id` text,
	`court_count` integer,
	`created_by_user_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `venue_location_idx` ON `venue` (`latitude`,`longitude`);--> statement-breakpoint
CREATE INDEX `venue_city_state_idx` ON `venue` (`city`,`state`);--> statement-breakpoint
CREATE UNIQUE INDEX `venue_radar_place_id_idx` ON `venue` (`radar_place_id`);--> statement-breakpoint
CREATE TABLE `video` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`media_type` text DEFAULT 'video' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`mux_upload_id` text,
	`mux_asset_id` text,
	`mux_playback_id` text,
	`mux_status` text,
	`r2_key` text,
	`thumbnail_url` text,
	`duration_seconds` integer,
	`venue_id` text,
	`latitude` real,
	`longitude` real,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`published_at` integer,
	FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`venue_id`) REFERENCES `venue`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `video_owner_status_idx` ON `video` (`owner_user_id`,`status`);--> statement-breakpoint
CREATE INDEX `video_venue_idx` ON `video` (`venue_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `video_mux_asset_id_idx` ON `video` (`mux_asset_id`);--> statement-breakpoint
CREATE TABLE `webhook_event` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`provider_event_id` text NOT NULL,
	`event_type` text NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`payload_json` text NOT NULL,
	`processed_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `webhook_event_provider_event_idx` ON `webhook_event` (`provider`,`provider_event_id`);--> statement-breakpoint
CREATE INDEX `webhook_event_provider_status_idx` ON `webhook_event` (`provider`,`status`);--> statement-breakpoint
ALTER TABLE `user` ADD `username` text;--> statement-breakpoint
ALTER TABLE `user` ADD `display_username` text;--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);