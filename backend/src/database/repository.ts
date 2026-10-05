import { db } from './db';
import { HistoricalRecord } from '../types/models';

export interface IFloodRepository {
  saveSnapshots(records: HistoricalRecord[]): void;
  getHistory(stationId: string, limitHours?: number): { history: HistoricalRecord[]; firstRecordedAt: string | null };
  calculateTrend(stationId: string): 'RISING' | 'STABLE' | 'FALLING' | null;
  setCachedSource(key: string, payload: any, count: number): void;
  getCachedSource<T>(key: string): { payload: T; updatedAt: string } | null;
}

export class SQLiteFloodRepository implements IFloodRepository {
  // Insert snapshot only if (station_id, measured_at) does not already exist
  private checkExistingStmt = db.prepare(`
    SELECT id FROM historical_snapshots WHERE station_id = ? AND measured_at = ? LIMIT 1
  `);

  private insertSnapshotStmt = db.prepare(`
    INSERT INTO historical_snapshots (station_id, station_type, value, measured_at)
    VALUES (?, ?, ?, ?)
  `);

  private upsertCacheStmt = db.prepare(`
    INSERT INTO cached_sources (source_key, payload, record_count, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(source_key) DO UPDATE SET
      payload = excluded.payload,
      record_count = excluded.record_count,
      updated_at = excluded.updated_at
  `);

  private getCacheStmt = db.prepare(`
    SELECT payload, updated_at FROM cached_sources WHERE source_key = ?
  `);

  saveSnapshots(records: HistoricalRecord[]): void {
    if (!records.length) return;
    for (const row of records) {
      try {
        // Deduplicate snapshots with identical timestamp for this station
        const existing = this.checkExistingStmt.get(row.stationId, row.timestamp);
        if (!existing) {
          this.insertSnapshotStmt.run(row.stationId, row.stationType, row.value, row.timestamp);
        }
      } catch (err) {
        // Ignore duplicate or constraint errors in bulk save
      }
    }
  }

  getHistory(stationId: string, limitHours: number = 24): { history: HistoricalRecord[]; firstRecordedAt: string | null } {
    const cutoffDate = new Date(Date.now() - limitHours * 3600 * 1000).toISOString();

    // Deduplicated history grouped by distinct measured_at
    const rows = db.prepare(`
      SELECT station_id as stationId, station_type as stationType, value, measured_at as timestamp
      FROM historical_snapshots
      WHERE station_id = ? AND measured_at >= ?
      GROUP BY measured_at
      ORDER BY measured_at ASC
    `).all(stationId, cutoffDate) as any[];

    // Earliest recorded snapshot for this station across all time
    const firstRow = db.prepare(`
      SELECT measured_at as firstRecordedAt
      FROM historical_snapshots
      WHERE station_id = ?
      ORDER BY measured_at ASC
      LIMIT 1
    `).get(stationId) as any;

    const history: HistoricalRecord[] = rows.map(r => ({
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

  calculateTrend(stationId: string): 'RISING' | 'STABLE' | 'FALLING' | null {
    const rows = db.prepare(`
      SELECT value, measured_at
      FROM historical_snapshots
      WHERE station_id = ?
      GROUP BY measured_at
      ORDER BY measured_at DESC
      LIMIT 10
    `).all(stationId) as any[];

    // Rule: Must have at least 3 distinct data points spanning at least 30 minutes
    if (!rows || rows.length < 3) return null;

    const latestTime = new Date(rows[0].measured_at).getTime();
    const oldestTime = new Date(rows[rows.length - 1].measured_at).getTime();
    if (isNaN(latestTime) || isNaN(oldestTime)) return null;

    const diffMinutes = Math.abs(latestTime - oldestTime) / (60 * 1000);
    if (diffMinutes < 30) return null;

    const latest = Number(rows[0].value);
    const oldest = Number(rows[rows.length - 1].value);
    const diff = latest - oldest;

    // A delta of > 0.05 indicates rise/fall
    if (diff > 0.05) return 'RISING';
    if (diff < -0.05) return 'FALLING';
    return 'STABLE';
  }

  setCachedSource(key: string, payload: any, count: number): void {
    const jsonStr = JSON.stringify(payload);
    const now = new Date().toISOString();
    this.upsertCacheStmt.run(key, jsonStr, count, now);
  }

  getCachedSource<T>(key: string): { payload: T; updatedAt: string } | null {
    const row = this.getCacheStmt.get(key) as any;
    if (!row || !row.payload) return null;
    try {
      return {
        payload: JSON.parse(row.payload) as T,
        updatedAt: String(row.updated_at)
      };
    } catch {
      return null;
    }
  }
}

export const repository = new SQLiteFloodRepository();
