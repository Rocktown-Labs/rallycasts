ALTER TABLE `venue` ADD `photo_url` text;--> statement-breakpoint
ALTER TABLE `venue` ADD `rating` real;--> statement-breakpoint
ALTER TABLE `venue` ADD `user_ratings_total` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `venue_google_place_id_idx` ON `venue` (`google_place_id`);