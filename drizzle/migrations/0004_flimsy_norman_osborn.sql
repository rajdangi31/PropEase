CREATE TABLE `property_workers` (
	`property_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`landlord_id` text NOT NULL,
	`property_id` text NOT NULL,
	`unit_id` text,
	`email` text,
	`rent_amount` integer,
	`lease_start` text,
	`lease_end` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`invite_type` text DEFAULT 'tenant' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`landlord_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_invitations`("id", "landlord_id", "property_id", "unit_id", "email", "rent_amount", "lease_start", "lease_end", "status", "invite_type", "created_at", "expires_at") SELECT "id", "landlord_id", "property_id", "unit_id", "email", "rent_amount", "lease_start", "lease_end", "status", "invite_type", "created_at", "expires_at" FROM `invitations`;--> statement-breakpoint
DROP TABLE `invitations`;--> statement-breakpoint
ALTER TABLE `__new_invitations` RENAME TO `invitations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;