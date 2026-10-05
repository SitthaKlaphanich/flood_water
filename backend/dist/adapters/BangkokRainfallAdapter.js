"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BangkokRainfallAdapter = void 0;
const https_1 = __importDefault(require("https"));
const BaseAdapter_1 = require("./BaseAdapter");
class BangkokRainfallAdapter extends BaseAdapter_1.BaseAdapter {
    name = 'สถานีวัดปริมาณน้ำฝน (BMA Rainfall Stations)';
    key = 'bangkok_rainfall';
    url = 'https://bmasedgis.bangkok.go.th/sedgis/rest/services/Hosted/%E0%B8%AA%E0%B8%96%E0%B8%B2%E0%B8%99%E0%B8%B5%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%9B%E0%B8%A3%E0%B8%B4%E0%B8%A1%E0%B8%B2%E0%B8%93%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%9D%E0%B8%99/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&f=json';
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
                const measuredAt = attr.site_time || fetchedAt;
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
                    id: `rain_${attr.code || attr.objectid}`,
                    code: attr.code || '',
                    name: attr.name || 'สถานีวัดน้ำฝน',
                    district: attr.district || undefined,
                    rf5min: Number(attr.rf5min) || 0,
                    rf15min: Number(attr.rf15min) || 0,
                    rf30min: Number(attr.rf30min) || 0,
                    rf1hr: Number(attr.rf1hr) || 0,
                    rf3hr: Number(attr.rf3hr) || 0,
                    rf6hr: Number(attr.rf6hr) || 0,
                    rf12hr: Number(attr.rf12hr) || 0,
                    rf24hr: Number(attr.rf24hr) || 0,
                    status: attr.status || 'ปกติ',
                    latitude: attr.latitude || 0,
                    longitude: attr.longitude || 0,
                    source: 'สำนักการระบายน้ำ กรุงเทพมหานคร (BMA Drainage Department)',
                    sourceUrl: 'https://weather.bangkok.go.th/rain/',
                    measuredAt,
                    fetchedAt,
                    dataAgeSeconds,
                    isOnline: attr.status !== 'ขัดข้อง'
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
exports.BangkokRainfallAdapter = BangkokRainfallAdapter;
