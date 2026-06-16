CREATE TABLE `event_score_submission` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`event_id` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`note` text,
	`player_one_score` integer NOT NULL,
	`player_two_score` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`submitted_by_user_id` text NOT NULL,
	`winner_user_id` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `event`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`match_id`) REFERENCES `event_match`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`submitted_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`winner_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_score_submission_match_status_idx` ON `event_score_submission` (`match_id`,`status`);--> statement-breakpoint
CREATE INDEX `event_score_submission_event_idx` ON `event_score_submission` (`event_id`);--> statement-breakpoint
CREATE INDEX `event_score_submission_submitted_by_idx` ON `event_score_submission` (`submitted_by_user_id`);--> statement-breakpoint
ALTER TABLE `video_comment` ADD `is_pinned` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `video_comment` ADD `pinned_at` integer;