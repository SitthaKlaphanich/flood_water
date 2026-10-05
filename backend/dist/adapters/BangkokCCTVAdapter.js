"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BangkokCCTVAdapter = void 0;
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const BaseAdapter_1 = require("./BaseAdapter");
class BangkokCCTVAdapter extends BaseAdapter_1.BaseAdapter {
    name = 'กล้อง CCTV สาธารณะ กรุงเทพมหานคร (BMA Traffic & Flood CCTV)';
    key = 'bangkok_cctv';
    url = 'http://www.bmatraffic.com/index.aspx';
    async fetch() {
        const start = performance.now();
        try {
            const cameras = [];
            // 1. Fetch BMA Traffic Cameras (518 locations)
            try {
                const bmaHtml = await this.httpGet('http://www.bmatraffic.com/index.aspx');
                const trafficCCTVs = this.parseBMATrafficCameras(bmaHtml);
                cameras.push(...trafficCCTVs);
            }
            catch (e) {
                console.warn(`[BangkokCCTVAdapter] Warning fetching bmatraffic.com: ${e.message}`);
            }
            // 2. Fetch BMA Flood Camera Profiles from Directus (if available)
            try {
                const floodCameras = await this.fetchFloodCameras();
                cameras.push(...floodCameras);
            }
            catch (e) {
                console.warn(`[BangkokCCTVAdapter] Warning fetching flood camera profiles: ${e.message}`);
            }
            if (cameras.length === 0) {
                throw new Error('No CCTV cameras retrieved from upstream sources');
            }
            this.updateHealthSuccess(cameras.length, performance.now() - start);
            return cameras;
        }
        catch (err) {
            this.updateHealthFailure(err.message, performance.now() - start);
            throw err;
        }
    }
    parseBMATrafficCameras(html) {
        const pos = html.indexOf('var locations = [');
        if (pos === -1)
            return [];
        const end = html.indexOf('];', pos);
        if (end === -1)
            return [];
        const code = html.substring(pos, end + 2);
        try {
            const fn = new Function(`${code}; return locations;`);
            const rawLocations = fn();
            const checkedAt = new Date().toISOString();
            return rawLocations.map((loc) => {
                const id = String(loc[0]);
                const name = String(loc[1] || loc[3] || `กล้อง BMA #${id}`);
                const nameEn = loc[2] && loc[2] !== '-' ? String(loc[2]) : undefined;
                const road = loc[3] && loc[3] !== '-' ? String(loc[3]) : undefined;
                const lat = Number(loc[5]) || 0;
                const lng = Number(loc[6]) || 0;
                return {
                    id: `cctv_bma_${id}`,
                    name,
                    nameEn,
                    latitude: lat,
                    longitude: lng,
                    road,
                    streamType: 'snapshot',
                    streamUrl: `http://www.bmatraffic.com/PlayVideo.aspx?ID=${id}`,
                    snapshotUrl: `http://www.bmatraffic.com/show.aspx?image=${id}`,
                    sourceUrl: `http://www.bmatraffic.com/PlayVideo.aspx?ID=${id}`,
                    lastCheckedAt: checkedAt,
                    isOnline: true,
                    source: 'สำนักการจราจรและขนส่ง กรุงเทพมหานคร (BMA Traffic)'
                };
            });
        }
        catch (err) {
            console.error('[BangkokCCTVAdapter] Error parsing locations array:', err);
            return [];
        }
    }
    async fetchFloodCameras() {
        const url = 'https://floodbangkok.bangkok.go.th/bkk/dds/services/api/floods/v1/items/camera_profile?limit=100&fields=id,CameraName,ThingName,LiveStream,Lat,Long,camera_description';
        const jsonStr = await this.httpsGet(url);
        const json = JSON.parse(jsonStr);
        if (!json.data || !Array.isArray(json.data))
            return [];
        const checkedAt = new Date().toISOString();
        return json.data
            .filter((c) => c.Lat && c.Long)
            .map((c) => ({
            id: `cctv_flood_${c.id || c.CameraName}`,
            name: c.camera_description ? `กล้องตรวจน้ำท่วม: ${c.camera_description}` : `กล้องตรวจน้ำท่วม (${c.CameraName})`,
            latitude: Number(c.Lat) || 0,
            longitude: Number(c.Long) || 0,
            streamType: 'external',
            streamUrl: c.LiveStream || undefined,
            sourceUrl: 'https://floodbangkok.bangkok.go.th/',
            lastCheckedAt: checkedAt,
            isOnline: true,
            source: 'ศูนย์ควบคุมระบบป้องกันน้ำท่วม สำนักการระบายน้ำ กทม.'
        }));
    }
    httpGet(targetUrl) {
        return new Promise((resolve, reject) => {
            const req = http_1.default.get(targetUrl, { timeout: 12000 }, (res) => {
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
    httpsGet(targetUrl) {
        return new Promise((resolve, reject) => {
            const req = https_1.default.get(targetUrl, { rejectUnauthorized: false, timeout: 12000 }, (res) => {
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
exports.BangkokCCTVAdapter = BangkokCCTVAdapter;
