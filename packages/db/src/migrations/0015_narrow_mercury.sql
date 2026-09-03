DROP INDEX `event_payment_registration_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `event_payment_registration_idx` ON `event_payment` (`registration_id`);