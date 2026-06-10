CREATE TABLE `venue_visit` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`duration_minutes` integer,
	`entered_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`exited_at` integer,
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`venue_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`venue_id`) REFERENCES `venue`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `venue_visit_venue_idx` ON `venue_visit` (`venue_id`);--> statement-breakpoint
CREATE INDEX `venue_visit_user_idx` ON `venue_visit` (`user_id`);--> statement-breakpoint
CREATE INDEX `venue_visit_entered_idx` ON `venue_visit` (`entered_at`);