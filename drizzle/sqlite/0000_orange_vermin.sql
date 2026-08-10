CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`key_hash` text NOT NULL,
	`name` text NOT NULL,
	`scopes` text NOT NULL,
	`last_used_at` text,
	`expires_at` text,
	`tenant_id` text DEFAULT 'default-workspace' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_hash_unique` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `api_keys_user_id_idx` ON `api_keys` (`user_id`);--> statement-breakpoint
CREATE INDEX `api_keys_tenant_id_idx` ON `api_keys` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `deployments` (
	`id` text PRIMARY KEY NOT NULL,
	`graph_id` text NOT NULL,
	`graph_name` text DEFAULT 'anonymous_graph' NOT NULL,
	`platform` text NOT NULL,
	`status` text NOT NULL,
	`url` text,
	`logs` text,
	`config` text DEFAULT '{}' NOT NULL,
	`deployed_by` text,
	`tenant_id` text DEFAULT 'default-workspace' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `deployments_graph_id_idx` ON `deployments` (`graph_id`);--> statement-breakpoint
CREATE INDEX `deployments_tenant_id_idx` ON `deployments` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `graphs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`name` text NOT NULL,
	`nodes` text NOT NULL,
	`connections` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`tenant_id` text DEFAULT 'default-workspace' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `graphs_project_id_idx` ON `graphs` (`project_id`);--> statement-breakpoint
CREATE INDEX `graphs_tenant_id_idx` ON `graphs` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `marketplace_items` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`data` text NOT NULL,
	`author` text NOT NULL,
	`downloads` integer DEFAULT 0 NOT NULL,
	`rating` real DEFAULT 0 NOT NULL,
	`reviews` text DEFAULT '[]' NOT NULL,
	`tenant_id` text DEFAULT 'default-workspace' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `memberships_user_id_idx` ON `memberships` (`user_id`);--> statement-breakpoint
CREATE INDEX `memberships_workspace_id_idx` ON `memberships` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`graph_id` text NOT NULL,
	`graph_name` text NOT NULL,
	`status` text NOT NULL,
	`total_tokens` integer DEFAULT 0 NOT NULL,
	`total_cost_usd` real DEFAULT 0 NOT NULL,
	`total_latency_ms` integer DEFAULT 0 NOT NULL,
	`error_message` text,
	`node_executions` text NOT NULL,
	`tenant_id` text DEFAULT 'default-workspace' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `metrics_graph_id_idx` ON `metrics` (`graph_id`);--> statement-breakpoint
CREATE INDEX `metrics_tenant_id_idx` ON `metrics` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `pipeline_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`graph_id` text NOT NULL,
	`status` text NOT NULL,
	`node_outputs` text DEFAULT '{}' NOT NULL,
	`completed_nodes` text DEFAULT '[]' NOT NULL,
	`activated_nodes` text DEFAULT '[]' NOT NULL,
	`step_count` integer DEFAULT 0 NOT NULL,
	`executed_count` text DEFAULT '{}' NOT NULL,
	`iterations_count` text DEFAULT '{}' NOT NULL,
	`logs` text DEFAULT '[]' NOT NULL,
	`variables` text DEFAULT '{}' NOT NULL,
	`error` text,
	`tenant_id` text DEFAULT 'default-workspace' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pipeline_runs_graph_id_idx` ON `pipeline_runs` (`graph_id`);--> statement-breakpoint
CREATE INDEX `pipeline_runs_tenant_id_idx` ON `pipeline_runs` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`user_id` text DEFAULT 'anonymous' NOT NULL,
	`tenant_id` text DEFAULT 'default-workspace' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `projects_tenant_id_idx` ON `projects` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `projects_user_id_idx` ON `projects` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`created_at` text NOT NULL,
	`budget` integer DEFAULT 1000000 NOT NULL,
	`used_tokens` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `versions` (
	`id` text PRIMARY KEY NOT NULL,
	`graph_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`created_at` text NOT NULL,
	`author` text NOT NULL,
	`snapshot` text NOT NULL,
	`commit_message` text NOT NULL,
	`diff_summary` text NOT NULL,
	`tenant_id` text DEFAULT 'default-workspace' NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `versions_graph_id_idx` ON `versions` (`graph_id`);--> statement-breakpoint
CREATE INDEX `versions_tenant_id_idx` ON `versions` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
