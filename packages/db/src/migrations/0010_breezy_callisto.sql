ALTER TABLE `event` ADD `host_label` text;--> statement-breakpoint
ALTER TABLE `event` ADD `host_type` text DEFAULT 'organizer' NOT NULL;