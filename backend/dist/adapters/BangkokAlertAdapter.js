"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BangkokAlertAdapter = void 0;
const https_1 = __importDefault(require("https"));
const BaseAdapter_1 = require("./BaseAdapter");
class BangkokAlertAdapter extends BaseAdapter_1.BaseAdapter {
    name = 'การแจ้งเตือนน้ำท่วม กทม. (BMA Flood Incident Notifications)';
    key = 'bangkok_alerts';
    url = 'https://floodbangkok.bangkok.go.th/bkk/dds/services/api/floods/v1/items/flood_notification?sort=-date_created&limit=50';
    async fetch() {
        const start = performance.now();
        try {
            const response = await this.httpGet(this.url);
            const json = JSON.parse(response);
            if (!json.data || !Array.isArray(json.data)) {
                throw new Error('Invalid Directus response format: missing data array');
            }
            const alerts = json.data.map((item) => {
                const val = parseFloat(item.value || item.heighest_value || '0') || 0;
                let severity = 'NORMAL';
                if (val > 30)
                    severity = 'CRITICAL';
                else if (val > 15)
                    severity = 'HIGH';
                else if (val > 5)
                    severity = 'MEDIUM';
                else if (val > 0)
                    severity = 'LOW';
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
        }
        catch (err) {
            this.updateHealthFailure(err.message, performance.now() - start);
            throw err;
        }
    }
    httpGet(targetUrl) {
        return new Promise((resolve, reject) => {
            const req = https_1.default.get(targetUrl, { rejectUnauthorized: false, timeout: 15000 }, (res) => {
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
exports.BangkokAlertAdapter = BangkokAlertAdapter;
