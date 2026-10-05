ALTER TABLE `casting_job` ADD `application_fee_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `casting_job` ADD `paid_at` integer;--> statement-breakpoint
ALTER TABLE `casting_job` ADD `payment_status` text DEFAULT 'unpaid' NOT NULL;--> statement-breakpoint
ALTER TABLE `casting_job` ADD `refunded_at` integer;