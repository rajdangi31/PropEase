CREATE TABLE `invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`landlord_id` text NOT NULL,
	`property_id` text NOT NULL,
	`unit_id` text NOT NULL,
	`email` text,
	`rent_amount` integer NOT NULL,
	`lease_start` text NOT NULL,
	`lease_end` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`landlord_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
