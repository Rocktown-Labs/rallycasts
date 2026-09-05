CREATE TABLE `ad_campaign` (
	`advertiser_id` text NOT NULL,
	`city` text,
	`cpm_cents` integer DEFAULT 500 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`created_by_user_id` text,
	`daily_budget_cents` integer DEFAULT 1000 NOT NULL,
	`ends_at` integer,
	`event_id` text NOT NULL,
	`funded_cents` integer DEFAULT 0 NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`placements` text DEFAULT 'both' NOT NULL,
	`rejection_reason` text,
	`reviewed_at` integer,
	`reviewed_by_user_id` text,
	`skill_level` text,
	`spent_cents` integer DEFAULT 0 NOT NULL,
	`starts_at` integer,
	`state` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`total_budget_cents` integer DEFAULT 5000 NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`venue_id` text,
	`video_cpm_cents` integer DEFAULT 1500 NOT NULL,
	FOREIGN KEY (`advertiser_id`) REFERENCES `advertiser`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`venue_id`) REFERENCES `venue`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ad_campaign_advertiser_idx` ON `ad_campaign` (`advertiser_id`);--> statement-breakpoint
CREATE INDEX `ad_campaign_event_idx` ON `ad_campaign` (`event_id`);--> statement-breakpoint
CREATE INDEX `ad_campaign_status_idx` ON `ad_campaign` (`status`);--> statement-breakpoint
CREATE TABLE `ad_creative` (
	`body` text,
	`campaign_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`cta_path` text,
	`id` text PRIMARY KEY NOT NULL,
	`image_url` text,
	`kind` text DEFAULT 'display' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`title` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`video_id` text,
	FOREIGN KEY (`campaign_id`) REFERENCES `ad_campaign`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ad_creative_campaign_idx` ON `ad_creative` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `ad_daily_stat` (
	`campaign_id` text NOT NULL,
	`clicks` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`day` text NOT NULL,
	`impressions` integer DEFAULT 0 NOT NULL,
	`placement` text DEFAULT 'display' NOT NULL,
	`spent_cents` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `ad_campaign`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ad_daily_stat_campaign_day_placement_idx` ON `ad_daily_stat` (`campaign_id`,`day`,`placement`);--> statement-breakpoint
CREATE INDEX `ad_daily_stat_day_idx` ON `ad_daily_stat` (`day`);--> statement-breakpoint
CREATE TABLE `ad_payment` (
	`amount_cents` integer NOT NULL,
	`campaign_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`stripe_checkout_session_id` text,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `ad_campaign`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ad_payment_campaign_idx` ON `ad_payment` (`campaign_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ad_payment_checkout_idx` ON `ad_payment` (`stripe_checkout_session_id`);--> statement-breakpoint
CREATE TABLE `advertiser` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `advertiser_organization_idx` ON `advertiser` (`organization_id`);