CREATE TABLE `background_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending',
	`attempts` integer DEFAULT 0,
	`max_attempts` integer DEFAULT 3,
	`last_error` text,
	`next_run_at` integer DEFAULT (strftime('%s', 'now')),
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX `bj_status_next_run_idx` ON `background_jobs` (`status`,`next_run_at`);--> statement-breakpoint
ALTER TABLE `payments` ADD `idempotency_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `payments_idempotency_key_unique` ON `payments` (`idempotency_key`);