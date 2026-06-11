CREATE TABLE `friend_request` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`from_user_id` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`message` text,
	`responded_at` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`to_user_id` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`from_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `friend_request_pair_pending_idx` ON `friend_request` (`from_user_id`,`to_user_id`,`status`);--> statement-breakpoint
CREATE INDEX `friend_request_to_status_idx` ON `friend_request` (`to_user_id`,`status`);--> statement-breakpoint
CREATE INDEX `friend_request_from_status_idx` ON `friend_request` (`from_user_id`,`status`);--> statement-breakpoint
CREATE TABLE `friendship` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`requester_user_id` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`requester_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `friendship_pair_idx` ON `friendship` (`user_id`,`requester_user_id`);--> statement-breakpoint
CREATE INDEX `friendship_user_idx` ON `friendship` (`user_id`);--> statement-breakpoint
CREATE INDEX `friendship_requester_idx` ON `friendship` (`requester_user_id`);--> statement-breakpoint
CREATE TABLE `notification` (
	`actor_user_id` text,
	`body` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`entity_id` text,
	`entity_type` text NOT NULL,
	`href` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`read_at` integer,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notification_user_read_created_idx` ON `notification` (`user_id`,`read_at`,`created_at`);--> statement-breakpoint
CREATE INDEX `notification_entity_idx` ON `notification` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `search_document` (
	`content` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`embedding_model` text,
	`embedding_status` text DEFAULT 'pending' NOT NULL,
	`entity_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`metadata_json` text,
	`title` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `search_document_entity_idx` ON `search_document` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `search_document_status_idx` ON `search_document` (`embedding_status`);--> statement-breakpoint
CREATE INDEX `search_document_title_idx` ON `search_document` (`title`);--> statement-breakpoint
CREATE TABLE `share` (
	`channel` text DEFAULT 'copy_link' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`entity_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`recipient_user_id` text,
	`user_id` text,
	FOREIGN KEY (`recipient_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `share_entity_idx` ON `share` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `share_user_idx` ON `share` (`user_id`);--> statement-breakpoint
CREATE TABLE `video_like` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`user_id` text NOT NULL,
	`video_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`video_id`) REFERENCES `video`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `video_like_user_video_idx` ON `video_like` (`video_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `video_like_video_idx` ON `video_like` (`video_id`);--> statement-breakpoint
CREATE INDEX `video_like_user_idx` ON `video_like` (`user_id`);