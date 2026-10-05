CREATE TABLE `user_subscription` (
	`cancel_at_period_end` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`current_period_end` integer,
	`id` text PRIMARY KEY NOT NULL,
	`interval` text NOT NULL,
	`price_id` text NOT NULL,
	`status` text NOT NULL,
	`stripe_customer_id` text NOT NULL,
	`stripe_subscription_id` text NOT NULL,
	`trial_ends_at` integer,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_subscription_user_idx` ON `user_subscription` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_subscription_user_id_unique` ON `user_subscription` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_subscription_subscription_idx` ON `user_subscription` (`stripe_subscription_id`);