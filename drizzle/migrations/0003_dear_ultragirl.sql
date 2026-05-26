CREATE TABLE `verification_codes` (
	`email` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`expires_at` text NOT NULL,
	`signup_data` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
