import https from 'https';
import { BaseAdapter } from './BaseAdapter';
import { WaterLevelPoint, SeverityLevel } from '../types/models';

export class BangkokWaterLevelAdapter extends BaseAdapter<WaterLevelPoint[]> {
  readonly name = 'ระดับน้ำในคลองและประตูระบายน้ำ (BMA Canal & Water Level Stations)';
  readonly key = 'bangkok_canal_water_level';
  readonly url = 'https://bmasedgis.bangkok.go.th/sedgis/rest/services/Hosted/waterlevel_297/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&f=json';

  async fetch(): Promise<WaterLevelPoint[]> {
    const start = performance.now();
    try {
      const response = await this.httpGet(this.url);
      const json = JSON.parse(response);

      if (!json.features || !Array.isArray(json.features)) {
        throw new Error('Invalid ArcGIS response format: missing features array');
      }

      const fetchedAt = new Date().toISOString();
      const points: WaterLevelPoint[] = json.features.map((f: any) => {
        const attr = f.attributes || {};
        const wl = typeof attr.wl_in === 'number' ? attr.wl_in : (attr.wl_in !== null && attr.wl_in !== undefined ? parseFloat(attr.wl_in) : undefined);
        const wlOut01 = typeof attr.wl_out01 === 'number' ? attr.wl_out01 : (attr.wl_out01 !== null && attr.wl_out01 !== undefined ? parseFloat(attr.wl_out01) : undefined);
        const wlOut02 = typeof attr.wl_out02 === 'number' ? attr.wl_out02 : (attr.wl_out02 !== null && attr.wl_out02 !== undefined ? parseFloat(attr.wl_out02) : undefined);
        
        const sourceStatus = attr.status || (attr.water_status ? String(attr.water_status) : 'ปกติ');

        // Strictly respect upstream status without inventing water level thresholds
        let calculatedSeverity: SeverityLevel = 'NORMAL';
        if (sourceStatus.includes('วิกฤต')) {
          calculatedSeverity = 'CRITICAL';
        } else if (sourceStatus.includes('เตือนภัย')) {
          calculatedSeverity = 'HIGH';
        } else if (sourceStatus.includes('เฝ้าระวัง')) {
          calculatedSeverity = 'MEDIUM';
        } else {
          calculatedSeverity = 'NORMAL';
        }

        // Gates extraction
        const gateCount = typeof attr.gate_count === 'number' ? attr.gate_count : 0;
        const gates: { gateNumber: number; openMeters: number | null }[] = [];
        for (let i = 1; i <= 6; i++) {
          const key = `gate0${i}`;
          if (attr[key] !== undefined && attr[key] !== null) {
            gates.push({
              gateNumber: i,
              openMeters: typeof attr[key] === 'number' ? attr[key] : parseFloat(attr[key])
            });
          }
        }

        // Pumps extraction
        const pumpCount = typeof attr.pump_count === 'number' ? attr.pump_count : 0;
        const totalPumpOn = typeof attr.total_pump_on === 'number' ? attr.total_pump_on : 0;
        const pumps: { pumpNumber: number; isOn: boolean }[] = [];
        for (let i = 1; i <= 51; i++) {
          const pad = i < 10 ? `0${i}` : `${i}`;
          const key = `pump${pad}`;
          if (attr[key] !== undefined && attr[key] !== null) {
            pumps.push({
              pumpNumber: i,
              isOn: Number(attr[key]) === 1
            });
          }
        }

        // Thailand ICT (UTC+7) timestamp handling
        let measuredAt = attr.site_time
          ? (attr.site_time.includes('+') || attr.site_time.endsWith('Z') ? attr.site_time : `${attr.site_time}+07:00`)
          : fetchedAt;

        let dataAgeSeconds = 0;
        try {
          const measuredDate = new Date(measuredAt).getTime();
          if (!isNaN(measuredDate)) {
            dataAgeSeconds = Math.max(0, Math.round((Date.now() - measuredDate) / 1000));
          }
        } catch {
          dataAgeSeconds = 0;
        }

        return {
          id: `wl_${attr.code || attr.objectid}`,
          code: attr.code || '',
          name: attr.name || 'ไม่ระบุชื่อสถานี',
          river: attr.river || undefined,
          district: attr.district || undefined,
          waterLevelM: wl,
          wlOut01,
          wlOut02,
          sourceStatus,
          calculatedSeverity,
          pumpCount,
          totalPumpOn,
          gateCount,
          gates: gates.length > 0 ? gates : undefined,
          pumps: pumps.length > 0 ? pumps : undefined,
          latitude: attr.latitude || 0,
          longitude: attr.longitude || 0,
          waterUrl: attr.water_url || undefined,
          source: 'สำนักการระบายน้ำ กรุงเทพมหานคร (BMA Drainage Department)',
          sourceUrl: attr.water_url || 'https://weather.bangkok.go.th/water/',
          measuredAt,
          fetchedAt,
          dataAgeSeconds,
          isOnline: sourceStatus !== 'ขัดข้อง' && sourceStatus !== 'ออฟไลน์'
        };
      });

      this.updateHealthSuccess(points.length, performance.now() - start);
      return points;
    } catch (err: any) {
      this.updateHealthFailure(err.message, performance.now() - start);
      throw err;
    }
  }

  private httpGet(targetUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = https.get(targetUrl, { rejectUnauthorized: false, timeout: 15000 }, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode} from ${targetUrl}`));
          return;
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout fetching ${targetUrl}`));
      });
    });
  }
}
