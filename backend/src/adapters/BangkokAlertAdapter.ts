import https from 'https';
import { BaseAdapter } from './BaseAdapter';
import { AlertItem, SeverityLevel } from '../types/models';

export class BangkokAlertAdapter extends BaseAdapter<AlertItem[]> {
  readonly name = 'การแจ้งเตือนน้ำท่วม กทม. (BMA Flood Incident Notifications)';
  readonly key = 'bangkok_alerts';
  readonly url = 'https://floodbangkok.bangkok.go.th/bkk/dds/services/api/floods/v1/items/flood_notification?sort=-date_created&limit=50';

  async fetch(): Promise<AlertItem[]> {
    const start = performance.now();
    try {
      const response = await this.httpGet(this.url);
      const json = JSON.parse(response);

      if (!json.data || !Array.isArray(json.data)) {
        throw new Error('Invalid Directus response format: missing data array');
      }

      const alerts: AlertItem[] = json.data.map((item: any) => {
        const val = parseFloat(item.value || item.heighest_value || '0') || 0;
        let severity: SeverityLevel = 'NORMAL';
        if (val > 30) severity = 'CRITICAL';
        else if (val > 15) severity = 'HIGH';
        else if (val > 5) severity = 'MEDIUM';
        else if (val > 0) severity = 'LOW';

        return {
          id: `alert_${item.id}`,
          title: item.text ? item.text.split(':')[0] : 'แจ้งเตือนน้ำท่วม',
          detail: item.text || 'พบรายงานน้ำท่วมขัง',
          waterLevelCm: val,
          sensorCode: item.text ? item.text.split(':')[0].trim() : undefined,
          calculatedSeverity: severity,
          measuredAt: item.noti_created_at || item.start_flood || item.date_created,
          source: 'สำนักการระบายน้ำ กรุงเทพมหานคร (BMA Drainage Department)',
          sourceUrl: 'https://floodbangkok.bangkok.go.th/'
        };
      });

      this.updateHealthSuccess(alerts.length, performance.now() - start);
      return alerts;
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
