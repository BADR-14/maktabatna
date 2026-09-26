CREATE TABLE `book_persons` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`created_by` text,
	`updated_by` text,
	`field_clock` text DEFAULT '{}' NOT NULL,
	`book_id` text NOT NULL,
	`person_id` text NOT NULL,
	`role` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `book_persons_book_idx` ON `book_persons` (`book_id`);--> statement-breakpoint
CREATE INDEX `book_persons_person_idx` ON `book_persons` (`person_id`);--> statement-breakpoint
CREATE TABLE `bookcases` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`created_by` text,
	`updated_by` text,
	`field_clock` text DEFAULT '{}' NOT NULL,
	`room_id` text NOT NULL,
	`number` integer NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`wall` text,
	`offset_cm` real,
	`elevation_cm` real,
	`width_cm` real,
	`height_cm` real,
	`depth_cm` real,
	`notes` text,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `bookcases_room_idx` ON `bookcases` (`room_id`);--> statement-breakpoint
CREATE TABLE `books` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`created_by` text,
	`updated_by` text,
	`field_clock` text DEFAULT '{}' NOT NULL,
	`title` text NOT NULL,
	`title_norm` text NOT NULL,
	`category_id` text,
	`publisher` text,
	`edition` text,
	`total_volumes` integer DEFAULT 1 NOT NULL,
	`notes` text,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `books_title_norm_idx` ON `books` (`title_norm`);--> statement-breakpoint
CREATE INDEX `books_category_idx` ON `books` (`category_id`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`created_by` text,
	`updated_by` text,
	`field_clock` text DEFAULT '{}' NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `change_log` (
	`id` text PRIMARY KEY NOT NULL,
	`table_name` text NOT NULL,
	`row_id` text NOT NULL,
	`field` text NOT NULL,
	`old_value` text,
	`new_value` text,
	`changed_by` text,
	`changed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `change_log_row_idx` ON `change_log` (`table_name`,`row_id`);--> statement-breakpoint
CREATE TABLE `copies` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`created_by` text,
	`updated_by` text,
	`field_clock` text DEFAULT '{}' NOT NULL,
	`book_id` text NOT NULL,
	`notes` text,
	FOREIGN KEY (`book_id`) REFERENCES `books`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `copies_book_idx` ON `copies` (`book_id`);--> statement-breakpoint
CREATE TABLE `loans` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`created_by` text,
	`updated_by` text,
	`field_clock` text DEFAULT '{}' NOT NULL,
	`copy_id` text NOT NULL,
	`borrower` text NOT NULL,
	`loaned_at` integer NOT NULL,
	`due_at` integer,
	`returned_at` integer,
	`notes` text,
	FOREIGN KEY (`copy_id`) REFERENCES `copies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `loans_copy_idx` ON `loans` (`copy_id`);--> statement-breakpoint
CREATE TABLE `local_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `persons` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`created_by` text,
	`updated_by` text,
	`field_clock` text DEFAULT '{}' NOT NULL,
	`name` text NOT NULL,
	`name_norm` text NOT NULL,
	`death_year_hijri` integer
);
--> statement-breakpoint
CREATE INDEX `persons_name_norm_idx` ON `persons` (`name_norm`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`created_by` text,
	`updated_by` text,
	`field_clock` text DEFAULT '{}' NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`width_cm` real,
	`depth_cm` real,
	`height_cm` real,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `sections` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`created_by` text,
	`updated_by` text,
	`field_clock` text DEFAULT '{}' NOT NULL,
	`bookcase_id` text NOT NULL,
	`number` integer NOT NULL,
	`width_ratio` real DEFAULT 1 NOT NULL,
	FOREIGN KEY (`bookcase_id`) REFERENCES `bookcases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sections_bookcase_idx` ON `sections` (`bookcase_id`);--> statement-breakpoint
CREATE TABLE `shelves` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`created_by` text,
	`updated_by` text,
	`field_clock` text DEFAULT '{}' NOT NULL,
	`section_id` text NOT NULL,
	`number` integer NOT NULL,
	`kind` text DEFAULT 'shelf' NOT NULL,
	`has_back_row` integer DEFAULT false NOT NULL,
	`height_cm` real,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `shelves_section_idx` ON `shelves` (`section_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`created_by` text,
	`updated_by` text,
	`field_clock` text DEFAULT '{}' NOT NULL,
	`display_name` text NOT NULL,
	`username` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `volumes` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`created_by` text,
	`updated_by` text,
	`field_clock` text DEFAULT '{}' NOT NULL,
	`copy_id` text NOT NULL,
	`shelf_id` text NOT NULL,
	`volume_number` integer,
	`row` text DEFAULT 'front' NOT NULL,
	`placement` text DEFAULT 'standing' NOT NULL,
	`position` text NOT NULL,
	`notes` text,
	FOREIGN KEY (`copy_id`) REFERENCES `copies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`shelf_id`) REFERENCES `shelves`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `volumes_shelf_idx` ON `volumes` (`shelf_id`,`row`,`position`);--> statement-breakpoint
CREATE INDEX `volumes_copy_idx` ON `volumes` (`copy_id`);