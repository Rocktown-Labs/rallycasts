CREATE TABLE `event_payment` (
	`amount_cents` integer NOT NULL,
	`application_fee_cents` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`event_id` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`registration_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`stripe_checkout_session_id` text,
	`stripe_payment_intent_id` text,
	`stripe_refund_id` text,
	`stripe_transfer_id` text,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`registration_id`) REFERENCES `event_registration`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_payment_checkout_idx` ON `event_payment` (`stripe_checkout_session_id`);--> statement-breakpoint
CREATE INDEX `event_payment_event_idx` ON `event_payment` (`event_id`);--> statement-breakpoint
CREATE INDEX `event_payment_registration_idx` ON `event_payment` (`registration_id`);--> statement-breakpoint
CREATE TABLE `organization` (
	`bio` text,
	`city` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`created_by_user_id` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`is_official` integer DEFAULT false NOT NULL,
	`logo_url` text,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`state` text,
	`stripe_account_id` text,
	`stripe_onboarding_status` text DEFAULT 'not_started' NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organization_slug_idx` ON `organization` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `organization_stripe_account_idx` ON `organization` (`stripe_account_id`);--> statement-breakpoint
CREATE INDEX `organization_location_idx` ON `organization` (`city`,`state`);--> statement-breakpoint
CREATE TABLE `organization_member` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`organization_id` text NOT NULL,
	`role` text DEFAULT 'editor' NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organization_member_org_user_idx` ON `organization_member` (`organization_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `organization_member_user_idx` ON `organization_member` (`user_id`);--> statement-breakpoint
ALTER TABLE `challenge` ADD `caster_fee_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `challenge` ADD `caster_tip_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `challenge` ADD `caster_user_id` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `challenge` ADD `court_label` text;--> statement-breakpoint
ALTER TABLE `challenge` ADD `payment_status` text DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
CREATE INDEX `challenge_caster_idx` ON `challenge` (`caster_user_id`);--> statement-breakpoint
ALTER TABLE `event` ADD `bracket_type` text DEFAULT 'single_elimination' NOT NULL;--> statement-breakpoint
ALTER TABLE `event` ADD `check_in_minutes` integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `event` ADD `court_labels_json` text;--> statement-breakpoint
ALTER TABLE `event` ADD `currency` text DEFAULT 'usd' NOT NULL;--> statement-breakpoint
ALTER TABLE `event` ADD `entry_fee_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `event` ADD `organization_id` text REFERENCES organization(id);--> statement-breakpoint
ALTER TABLE `event` ADD `refund_policy` text DEFAULT 'Full refund before registration closes; automatic refund if cancelled.' NOT NULL;--> statement-breakpoint
ALTER TABLE `event` ADD `registration_deadline` integer;--> statement-breakpoint
CREATE INDEX `event_organization_idx` ON `event` (`organization_id`);--> statement-breakpoint
ALTER TABLE `event_registration` ADD `paid_amount_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `event_registration` ADD `payment_status` text DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE `event_registration` ADD `stripe_checkout_session_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `event_registration_checkout_idx` ON `event_registration` (`stripe_checkout_session_id`);--> statement-breakpoint
ALTER TABLE `post` ADD `organization_id` text REFERENCES organization(id);--> statement-breakpoint
CREATE INDEX `post_organization_idx` ON `post` (`organization_id`);--> statement-breakpoint
ALTER TABLE `video` ADD `organization_id` text REFERENCES organization(id);--> statement-breakpoint
CREATE INDEX `video_organization_idx` ON `video` (`organization_id`);