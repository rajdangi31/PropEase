CREATE TABLE `locality_stats` (
	`id` text PRIMARY KEY NOT NULL,
	`city` text NOT NULL,
	`locality` text NOT NULL,
	`avg_price_per_sqft` integer NOT NULL,
	`min_price_per_sqft` integer NOT NULL,
	`max_price_per_sqft` integer NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `locality_city_idx` ON `locality_stats` (`city`,`locality`);--> statement-breakpoint
CREATE TABLE `nearby_places` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`category` text NOT NULL,
	`name` text NOT NULL,
	`distance_meters` integer NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `property_insights` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`location_score` integer NOT NULL,
	`schools_score` integer NOT NULL,
	`healthcare_score` integer NOT NULL,
	`transit_score` integer NOT NULL,
	`convenience_score` integer NOT NULL,
	`lifestyle_score` integer NOT NULL,
	`schools_count` integer DEFAULT 0 NOT NULL,
	`hospitals_count` integer DEFAULT 0 NOT NULL,
	`transit_count` integer DEFAULT 0 NOT NULL,
	`restaurants_count` integer DEFAULT 0 NOT NULL,
	`generated_at` text DEFAULT CURRENT_TIMESTAMP,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rent_predictions` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`unit_id` text,
	`predicted_rent` integer NOT NULL,
	`min_estimate` integer NOT NULL,
	`max_estimate` integer NOT NULL,
	`confidence_score` integer NOT NULL,
	`explanation` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_lease_tenants` (
	`lease_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`is_primary` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY(`lease_id`, `profile_id`),
	FOREIGN KEY (`lease_id`) REFERENCES `leases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_lease_tenants`("lease_id", "profile_id", "is_primary", "created_at", "updated_at") SELECT "lease_id", "profile_id", "is_primary", "created_at", "updated_at" FROM `lease_tenants`;--> statement-breakpoint
DROP TABLE `lease_tenants`;--> statement-breakpoint
ALTER TABLE `__new_lease_tenants` RENAME TO `lease_tenants`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `lt_profile_idx` ON `lease_tenants` (`profile_id`);--> statement-breakpoint
CREATE TABLE `__new_property_workers` (
	`property_id` text NOT NULL,
	`profile_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY(`property_id`, `profile_id`),
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_property_workers`("property_id", "profile_id", "created_at") SELECT "property_id", "profile_id", "created_at" FROM `property_workers`;--> statement-breakpoint
DROP TABLE `property_workers`;--> statement-breakpoint
ALTER TABLE `__new_property_workers` RENAME TO `property_workers`;--> statement-breakpoint
ALTER TABLE `properties` ADD `city` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `locality` text;--> statement-breakpoint
CREATE INDEX `city_idx` ON `properties` (`city`);--> statement-breakpoint
CREATE INDEX `locality_idx` ON `properties` (`locality`);--> statement-breakpoint
CREATE INDEX `prop_landlord_idx` ON `properties` (`landlord_id`);--> statement-breakpoint
ALTER TABLE `units` ADD `furnished_status` text DEFAULT 'unfurnished';--> statement-breakpoint
ALTER TABLE `units` ADD `parking` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `units` ADD `balcony_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `units` ADD `property_age` integer DEFAULT 0;--> statement-breakpoint
CREATE INDEX `status_idx` ON `units` (`status`);--> statement-breakpoint
CREATE INDEX `rent_idx` ON `units` (`current_market_rent`);--> statement-breakpoint
CREATE INDEX `beds_idx` ON `units` (`beds`);--> statement-breakpoint
CREATE INDEX `unit_property_idx` ON `units` (`property_id`);--> statement-breakpoint
CREATE INDEX `activity_created_idx` ON `activity_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `activity_actor_idx` ON `activity_logs` (`actor_id`);--> statement-breakpoint
CREATE INDEX `doc_tenant_idx` ON `documents` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `doc_property_idx` ON `documents` (`property_id`);--> statement-breakpoint
CREATE INDEX `lease_unit_status_idx` ON `leases` (`unit_id`,`status`);--> statement-breakpoint
CREATE INDEX `lease_status_idx` ON `leases` (`status`);--> statement-breakpoint
CREATE INDEX `maint_unit_idx` ON `maintenance_requests` (`unit_id`);--> statement-breakpoint
CREATE INDEX `maint_tenant_idx` ON `maintenance_requests` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `maint_worker_idx` ON `maintenance_requests` (`assigned_worker_id`);--> statement-breakpoint
CREATE INDEX `maint_status_idx` ON `maintenance_requests` (`status`);--> statement-breakpoint
CREATE INDEX `notif_recipient_idx` ON `notifications` (`recipient_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `pay_lease_idx` ON `payments` (`lease_id`);--> statement-breakpoint
CREATE INDEX `pay_tenant_idx` ON `payments` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `pay_status_idx` ON `payments` (`status`);--> statement-breakpoint
CREATE INDEX `pay_due_date_idx` ON `payments` (`due_date`);