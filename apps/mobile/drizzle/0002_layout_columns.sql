ALTER TABLE `bookcases` ADD `wall_side` text;--> statement-breakpoint
ALTER TABLE `bookcases` ADD `finish` text DEFAULT 'wood' NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `openings` text DEFAULT '[]' NOT NULL;