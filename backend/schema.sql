-- schema.sql
CREATE TABLE IF NOT EXISTS tracked_media (
    key TEXT PRIMARY KEY,
    media_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    poster_path TEXT,
    duration TEXT,
    status TEXT NOT NULL,
    liked INTEGER NOT NULL DEFAULT 0,
    rating REAL NOT NULL DEFAULT 0,
    notes TEXT,
    notes_updated_at TEXT,
    updated_at TEXT NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_media_updated_at ON tracked_media(updated_at);

CREATE TABLE IF NOT EXISTS custom_lists (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    items_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_lists_updated_at ON custom_lists(updated_at);