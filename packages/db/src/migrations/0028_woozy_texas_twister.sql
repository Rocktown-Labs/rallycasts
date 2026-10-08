CREATE TABLE `apikey` (
	`config_id` text DEFAULT 'default' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`expires_at` integer,
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`last_refill_at` integer,
	`last_request` integer,
	`metadata` text,
	`name` text,
	`permissions` text,
	`prefix` text,
	`rate_limit_enabled` integer DEFAULT true NOT NULL,
	`rate_limit_max` integer,
	`rate_limit_time_window` integer,
	`reference_id` text NOT NULL,
	`refill_amount` integer,
	`refill_interval` integer,
	`remaining` integer,
	`request_count` integer,
	`start` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`reference_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `apikey_config_id_idx` ON `apikey` (`config_id`);--> statement-breakpoint
CREATE INDEX `apikey_reference_id_idx` ON `apikey` (`reference_id`);