-- Migration: Add Graph Versioning Fields
ALTER TABLE graphs ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE graphs ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE graphs ADD COLUMN IF NOT EXISTS parent_version_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS graphs_name_version_idx ON graphs(name, version);
