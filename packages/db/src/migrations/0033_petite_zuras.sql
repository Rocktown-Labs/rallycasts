CREATE TABLE `profile_like` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`profile_user_id` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`profile_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profile_like_pair_idx` ON `profile_like` (`user_id`,`profile_user_id`);--> statement-breakpoint
CREATE INDEX `profile_like_profile_idx` ON `profile_like` (`profile_user_id`);--> statement-breakpoint
CREATE INDEX `profile_like_user_idx` ON `profile_like` (`user_id`);