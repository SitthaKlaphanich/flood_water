"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repository = exports.SQLiteFloodRepository = void 0;
const db_1 = require("./db");
class SQLiteFloodRepository {
    // Insert snapshot only if (station_id, measured_at) does not already exist
    checkExistingStmt = db_1.db.prepare(`
    SELECT id FROM historical_snapshots WHERE station_id = ? AND measured_at = ? LIMIT 1
  `);
    insertSnapshotStmt = db_1.db.prepare(`
    INSERT INTO historical_snapshots (station_id, station_type, value, measured_at)
    VALUES (?, ?, ?, ?)
  `);
    upsertCacheStmt = db_1.db.prepare(`
    INSERT INTO cached_sources (source_key, payload, record_count, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(source_key) DO UPDATE SET
      payload = excluded.payload,
      record_count = excluded.record_count,
      updated_at = excluded.updated_at
  `);
    getCacheStmt = db_1.db.prepare(`
    SELECT payload, updated_at FROM cached_sources WHERE source_key = ?
  `);
    saveSnapshots(records) {
        if (!records.length)
            return;
        for (const row of records) {
            try {
                // Deduplicate snapshots with identical timestamp for this station
                const existing = this.checkExistingStmt.get(row.stationId, row.timestamp);
                if (!existing) {
                    this.insertSnapshotStmt.run(row.stationId, row.stationType, row.value, row.timestamp);
                }
            }
            catch (err) {
                // Ignore duplicate or constraint errors in bulk save
            }
        }
    }
    getHistory(stationId, limitHours = 24) {
        const cutoffDate = new Date(Date.now() - limitHours * 3600 * 1000).toISOString();
        // Deduplicated history grouped by distinct measured_at
        const rows = db_1.db.prepare(`
      SELECT station_id as stationId, station_type as stationType, value, measured_at as timestamp
      FROM historical_snapshots
      WHERE station_id = ? AND measured_at >= ?
      GROUP BY measured_at
      ORDER BY measured_at ASC
    `).all(stationId, cutoffDate);
        // Earliest recorded snapshot for this station across all time
        const firstRow = db_1.db.prepare(`
      SELECT measured_at as firstRecordedAt
      FROM historical_snapshots
      WHERE station_id = ?
      ORDER BY measured_at ASC
      LIMIT 1
    `).get(stationId);
        const history = rows.map(r => ({
            stationId: String(r.stationId),
            stationType: r.stationType,
            value: Number(r.value),
            timestamp: String(r.timestamp)
        }));
        return {
            history,
            firstRecordedAt: firstRow ? String(firstRow.firstRecordedAt) : null
        };
    }
    calculateTrend(stationId) {
        const rows = db_1.db.prepare(`
      SELECT value, measured_at
      FROM historical_snapshots
      WHERE station_id = ?
      GROUP BY measured_at
      ORDER BY measured_at DESC
      LIMIT 10
    `).all(stationId);
        // Rule: Must have at least 3 distinct data points spanning at least 30 minutes
        if (!rows || rows.length < 3)
            return null;
        const latestTime = new Date(rows[0].measured_at).getTime();
        const oldestTime = new Date(rows[rows.length - 1].measured_at).getTime();
        if (isNaN(latestTime) || isNaN(oldestTime))
            return null;
        const diffMinutes = Math.abs(latestTime - oldestTime) / (60 * 1000);
        if (diffMinutes < 30)
            return null;
        const latest = Number(rows[0].value);
        const oldest = Number(rows[rows.length - 1].value);
        const diff = latest - oldest;
        // A delta of > 0.05 indicates rise/fall
        if (diff > 0.05)
            return 'RISING';
        if (diff < -0.05)
            return 'FALLING';
        return 'STABLE';
    }
    setCachedSource(key, payload, count) {
        const jsonStr = JSON.stringify(payload);
        const now = new Date().toISOString();
        this.upsertCacheStmt.run(key, jsonStr, count, now);
    }
    getCachedSource(key) {
        const row = this.getCacheStmt.get(key);
        if (!row || !row.payload)
            return null;
        try {
            return {
                payload: JSON.parse(row.payload),
                updatedAt: String(row.updated_at)
            };
        }
        catch {
            return null;
        }
    }
}
exports.SQLiteFloodRepository = SQLiteFloodRepository;
exports.repository = new SQLiteFloodRepository();
