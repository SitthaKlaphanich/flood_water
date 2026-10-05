"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BangkokFloodAdapter = void 0;
const https_1 = __importDefault(require("https"));
const BaseAdapter_1 = require("./BaseAdapter");
class BangkokFloodAdapter extends BaseAdapter_1.BaseAdapter {
    name = 'สถานีวัดน้ำท่วมถนน (BMA Road Flood Stations)';
    key = 'bangkok_road_flood';
    url = 'https://bmasedgis.bangkok.go.th/sedgis/rest/services/Hosted/%E0%B8%AA%E0%B8%96%E0%B8%B2%E0%B8%99%E0%B8%B5%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%97%E0%B9%88%E0%B8%A7%E0%B8%A1%E0%B8%96%E0%B8%99%E0%B8%99_252/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&f=json';
    async fetch() {
        const start = performance.now();
        try {
            const response = await this.httpGet(this.url);
            const json = JSON.parse(response);
            if (!json.features || !Array.isArray(json.features)) {
                throw new Error('Invalid ArcGIS response format: missing features array');
            }
            const fetchedAt = new Date().toISOString();
            const points = json.features.map((f) => {
                const attr = f.attributes || {};
                const floodCm = typeof attr.flood === 'number' ? attr.flood : parseFloat(attr.flood || '0') || 0;
                let calculatedSeverity = 'NORMAL';
                if (floodCm > 30)
                    calculatedSeverity = 'CRITICAL';
                else if (floodCm > 15)
                    calculatedSeverity = 'HIGH';
                else if (floodCm > 5)
                    calculatedSeverity = 'MEDIUM';
                else if (floodCm > 0)
                    calculatedSeverity = 'LOW';
                // Parse site_time
                let measuredAt = attr.site_time || attr.date_updated || fetchedAt;
                let dataAgeSeconds = 0;
                try {
                    const measuredDate = new Date(measuredAt).getTime();
                    if (!isNaN(measuredDate)) {
                        dataAgeSeconds = Math.max(0, Math.round((Date.now() - measuredDate) / 1000));
                    }
                }
                catch {
                    dataAgeSeconds = 0;
                }
                return {
                    id: `flood_${attr.id || attr.code || attr.objectid}`,
                    code: attr.code || '',
                    name: attr.name || 'ไม่ระบุชื่อจุดตรวจวัด',
                    latitude: attr.lat || 0,
                    longitude: attr.long_ || attr.long || 0,
                    district: attr.district || undefined,
                    road: attr.road || undefined,
                    waterLevelCm: floodCm,
                    sourceStatus: attr.device_status || 'normal',
                    calculatedSeverity,
                    mainRoad: String(attr.main_road).toLowerCase() === 'true',
                    source: 'สำนักการระบายน้ำ กรุงเทพมหานคร (BMA Drainage Department)',
                    sourceUrl: 'https://floodbangkok.bangkok.go.th/',
                    measuredAt,
                    fetchedAt,
                    dataAgeSeconds,
                    isOnline: attr.device_status !== 'malfunction' && attr.device_status !== 'offline'
                };
            });
            this.updateHealthSuccess(points.length, performance.now() - start);
            return points;
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
exports.BangkokFloodAdapter = BangkokFloodAdapter;
