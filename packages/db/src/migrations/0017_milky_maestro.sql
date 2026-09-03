ALTER TABLE `venue_visit` ADD `radar_event_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `venue_visit_radar_event_idx` ON `venue_visit` (`radar_event_id`);