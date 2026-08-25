CREATE TABLE `site_content` (
	`content_key` text PRIMARY KEY NOT NULL,
	`content_json` text NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text NOT NULL
);
