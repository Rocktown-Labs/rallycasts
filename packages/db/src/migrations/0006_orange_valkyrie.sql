CREATE TABLE `post` (
	`content` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `post_user_idx` ON `post` (`user_id`);--> statement-breakpoint
CREATE INDEX `post_created_idx` ON `post` (`created_at`);--> statement-breakpoint
CREATE TABLE `post_comment` (
	`content` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `post_comment_post_idx` ON `post_comment` (`post_id`);--> statement-breakpoint
CREATE INDEX `post_comment_user_idx` ON `post_comment` (`user_id`);--> statement-breakpoint
CREATE TABLE `post_like` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`post_id` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_like_user_post_idx` ON `post_like` (`post_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `post_like_post_idx` ON `post_like` (`post_id`);--> statement-breakpoint
ALTER TABLE `challenge` ADD `casting_split_mode` text;--> statement-breakpoint
ALTER TABLE `challenge` ADD `is_casted` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `challenge` ADD `match_mode` text;--> statement-breakpoint
ALTER TABLE `challenge` ADD `partner_user_id` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `challenge` ADD `result` text;--> statement-breakpoint
ALTER TABLE `challenge` ADD `video_url` text;--> statement-breakpoint
CREATE INDEX `challenge_partner_idx` ON `challenge` (`partner_user_id`);