ALTER TABLE `casting_job` ADD `charged_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `casting_job` ADD `paid_out_at` integer;--> statement-breakpoint
ALTER TABLE `casting_job` ADD `stripe_transfer_id` text;