"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const node_sqlite_1 = require("node:sqlite");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
// Ensure data folder exists
const dbDir = path_1.default.dirname(config_1.config.dbPath);
if (!fs_1.default.existsSync(dbDir)) {
    fs_1.default.mkdirSync(dbDir, { recursive: true });
}
exports.db = new node_sqlite_1.DatabaseSync(config_1.config.dbPath);
// Initialize tables from schema.sql
const candidatePaths = [
    path_1.default.resolve(__dirname, 'schema.sql'),
    path_1.default.resolve(__dirname, '../src/database/schema.sql'),
    path_1.default.resolve(__dirname, '../../src/database/schema.sql')
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
    if (fs_1.default.existsSync(p)) {
        schema = fs_1.default.readFileSync(p, 'utf-8');
        break;
    }
}
exports.db.exec(schema);
console.log(`[Database] Initialized native SQLite database at ${config_1.config.dbPath}`);
