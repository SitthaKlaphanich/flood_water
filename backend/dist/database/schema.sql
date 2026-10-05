-- Historical station data snapshots
CREATE TABLE IF NOT EXISTS historical_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  station_id TEXT NOT NULL,
  station_type TEXT NOT NULL,
  value REAL NOT NULL,
  measured_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_snapshots_station_time 
ON historical_snapshots (station_id, measured_at);

-- Backup cache for offline resilience
CREATE TABLE IF NOT EXISTS cached_sources (
  source_key TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
