CREATE TABLE `ride_events` (
	`id` text PRIMARY KEY NOT NULL,
	`ride_id` text NOT NULL,
	`type` text NOT NULL,
	`detail` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`ride_id`) REFERENCES `rides`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ride_events_ride_idx` ON `ride_events` (`ride_id`);--> statement-breakpoint
CREATE TABLE `rides` (
	`id` text PRIMARY KEY NOT NULL,
	`rider_id` text NOT NULL,
	`status` text NOT NULL,
	`pickup_name` text NOT NULL,
	`pickup_lng_e6` integer NOT NULL,
	`pickup_lat_e6` integer NOT NULL,
	`dropoff_name` text NOT NULL,
	`dropoff_lng_e6` integer NOT NULL,
	`dropoff_lat_e6` integer NOT NULL,
	`distance_meters` integer NOT NULL,
	`duration_seconds` integer NOT NULL,
	`fare_cents` integer NOT NULL,
	`stripe_session_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`rider_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `rides_rider_idx` ON `rides` (`rider_id`);--> statement-breakpoint
CREATE INDEX `rides_status_idx` ON `rides` (`status`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`role` text DEFAULT 'rider' NOT NULL,
	`name` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_unique` ON `users` (`phone`);