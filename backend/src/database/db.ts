import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

// Ensure data folder exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(config.dbPath);

// Initialize tables from schema.sql
const candidatePaths = [
  path.resolve(__dirname, 'schema.sql'),
  path.resolve(__dirname, '../src/database/schema.sql'),
  path.resolve(__dirname, '../../src/database/schema.sql')
];

let schema = `
CREATE TABLE IF NOT EXISTS historical_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  station_id TEXT NOT NULL,
  station_type TEXT NOT NULL,
  value REAL NOT NULL,
  measured_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_snapshots_station_time ON historical_snapshots (station_id, measured_at);
CREATE TABLE IF NOT EXISTS cached_sources (
  source_key TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
`;

for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    schema = fs.readFileSync(p, 'utf-8');
    break;
  }
}

db.exec(schema);

console.log(`[Database] Initialized native SQLite database at ${config.dbPath}`);
