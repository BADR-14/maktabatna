-- Reading: progress, logs, per-person settings, family challenges, points. Sync triggers for the new tables (see scripts/build-sync-sql.mjs).
CREATE TABLE `challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`created_by` text,
	`updated_by` text,
	`field_clock` text DEFAULT '{}' NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`kind` text NOT NULL,
	`target` integer NOT NULL,
	`category_id` text,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`reward` text
);
--> statement-breakpoint
CREATE TABLE `motivation` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`created_by` text,
	`updated_by` text,
	`field_clock` text DEFAULT '{}' NOT NULL,
	`points_per_page` integer DEFAULT 1 NOT NULL,
	`points_per_book` integer DEFAULT 50 NOT NULL,
	`badge_rewards` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reading_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`reading_id` text NOT NULL,
	`book_id` text NOT NULL,
	`at` integer NOT NULL,
	`day` text NOT NULL,
	`pages` integer DEFAULT 0 NOT NULL,
	`percent` real NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reading_logs_user_idx` ON `reading_logs` (`user_id`,`day`);--> statement-breakpoint
CREATE TABLE `readings` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`created_by` text,
	`updated_by` text,
	`field_clock` text DEFAULT '{}' NOT NULL,
	`user_id` text NOT NULL,
	`book_id` text NOT NULL,
	`status` text DEFAULT 'reading' NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`page` integer,
	`percent` real DEFAULT 0 NOT NULL,
	`volumes_done` integer,
	`rating` integer,
	`note` text,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `readings_user_idx` ON `readings` (`user_id`);--> statement-breakpoint
CREATE INDEX `readings_book_idx` ON `readings` (`book_id`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`created_by` text,
	`updated_by` text,
	`field_clock` text DEFAULT '{}' NOT NULL,
	`reading_public` integer DEFAULT true NOT NULL,
	`daily_pages_goal` integer,
	`monthly_books_goal` integer,
	`reminder_time` text
);
--> statement-breakpoint
ALTER TABLE `books` ADD `page_count` integer;
--> statement-breakpoint
CREATE TRIGGER `sync_readings_ins` AFTER INSERT ON `readings` WHEN (SELECT `value` FROM `local_meta` WHERE `key` = 'sync_applying') IS NULL BEGIN INSERT INTO `sync_outbox` (`table_name`, `row_id`) VALUES ('readings', NEW.`id`); END;
--> statement-breakpoint
CREATE TRIGGER `sync_readings_upd` AFTER UPDATE ON `readings` WHEN (SELECT `value` FROM `local_meta` WHERE `key` = 'sync_applying') IS NULL BEGIN INSERT INTO `sync_outbox` (`table_name`, `row_id`) VALUES ('readings', NEW.`id`); END;
--> statement-breakpoint
CREATE TRIGGER `sync_reading_logs_ins` AFTER INSERT ON `reading_logs` WHEN (SELECT `value` FROM `local_meta` WHERE `key` = 'sync_applying') IS NULL BEGIN INSERT INTO `sync_outbox` (`table_name`, `row_id`) VALUES ('reading_logs', NEW.`id`); END;
--> statement-breakpoint
CREATE TRIGGER `sync_reading_logs_upd` AFTER UPDATE ON `reading_logs` WHEN (SELECT `value` FROM `local_meta` WHERE `key` = 'sync_applying') IS NULL BEGIN INSERT INTO `sync_outbox` (`table_name`, `row_id`) VALUES ('reading_logs', NEW.`id`); END;
--> statement-breakpoint
CREATE TRIGGER `sync_user_settings_ins` AFTER INSERT ON `user_settings` WHEN (SELECT `value` FROM `local_meta` WHERE `key` = 'sync_applying') IS NULL BEGIN INSERT INTO `sync_outbox` (`table_name`, `row_id`) VALUES ('user_settings', NEW.`id`); END;
--> statement-breakpoint
CREATE TRIGGER `sync_user_settings_upd` AFTER UPDATE ON `user_settings` WHEN (SELECT `value` FROM `local_meta` WHERE `key` = 'sync_applying') IS NULL BEGIN INSERT INTO `sync_outbox` (`table_name`, `row_id`) VALUES ('user_settings', NEW.`id`); END;
--> statement-breakpoint
CREATE TRIGGER `sync_challenges_ins` AFTER INSERT ON `challenges` WHEN (SELECT `value` FROM `local_meta` WHERE `key` = 'sync_applying') IS NULL BEGIN INSERT INTO `sync_outbox` (`table_name`, `row_id`) VALUES ('challenges', NEW.`id`); END;
--> statement-breakpoint
CREATE TRIGGER `sync_challenges_upd` AFTER UPDATE ON `challenges` WHEN (SELECT `value` FROM `local_meta` WHERE `key` = 'sync_applying') IS NULL BEGIN INSERT INTO `sync_outbox` (`table_name`, `row_id`) VALUES ('challenges', NEW.`id`); END;
--> statement-breakpoint
CREATE TRIGGER `sync_motivation_ins` AFTER INSERT ON `motivation` WHEN (SELECT `value` FROM `local_meta` WHERE `key` = 'sync_applying') IS NULL BEGIN INSERT INTO `sync_outbox` (`table_name`, `row_id`) VALUES ('motivation', NEW.`id`); END;
--> statement-breakpoint
CREATE TRIGGER `sync_motivation_upd` AFTER UPDATE ON `motivation` WHEN (SELECT `value` FROM `local_meta` WHERE `key` = 'sync_applying') IS NULL BEGIN INSERT INTO `sync_outbox` (`table_name`, `row_id`) VALUES ('motivation', NEW.`id`); END;
--> statement-breakpoint
INSERT INTO `motivation` (`id`, `created_at`, `updated_at`) VALUES ('93a59f16-96bd-5461-805c-476ece977e6c', 1790380800000, 1790380800000);
