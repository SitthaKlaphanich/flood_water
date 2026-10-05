"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BangkokGISAdapter = void 0;
const https_1 = __importDefault(require("https"));
const BaseAdapter_1 = require("./BaseAdapter");
class BangkokGISAdapter extends BaseAdapter_1.BaseAdapter {
    name = 'ข้อมูลภูมิสารสนเทศ กทม. (BMA GIS Districts & Canals)';
    key = 'bangkok_gis';
    url = 'https://bmasedgis.bangkok.go.th/sedgis/rest/services/Hosted/bma_district/FeatureServer/0';
    cachedDistricts = null;
    cachedCanals = null;
    async fetch() {
        const start = performance.now();
        try {
            if (!this.cachedDistricts) {
                const districtsUrl = 'https://bmasedgis.bangkok.go.th/sedgis/rest/services/Hosted/bma_district/FeatureServer/0/query?where=1%3D1&outFields=dname,dname_e,dcode&f=geojson';
                const rawDistricts = await this.httpGet(districtsUrl);
                this.cachedDistricts = JSON.parse(rawDistricts);
            }
            if (!this.cachedCanals) {
                const canalsUrl = 'https://bmasedgis.bangkok.go.th/sedgis/rest/services/Hosted/canal_dds_gdb/FeatureServer/0/query?where=1%3D1&outFields=canal_name,district_t&f=geojson&resultRecordCount=300';
                try {
                    const rawCanals = await this.httpGet(canalsUrl);
                    this.cachedCanals = JSON.parse(rawCanals);
                }
                catch (e) {
                    console.warn('[BangkokGISAdapter] Warning fetching canals:', e.message);
                    this.cachedCanals = { type: 'FeatureCollection', features: [] };
                }
            }
            const totalFeatures = (this.cachedDistricts?.features.length || 0) + (this.cachedCanals?.features.length || 0);
            this.updateHealthSuccess(totalFeatures, performance.now() - start);
            return {
                districts: this.cachedDistricts || { type: 'FeatureCollection', features: [] },
                canals: this.cachedCanals || { type: 'FeatureCollection', features: [] }
            };
        }
        catch (err) {
            this.updateHealthFailure(err.message, performance.now() - start);
            return {
                districts: this.cachedDistricts || { type: 'FeatureCollection', features: [] },
                canals: this.cachedCanals || { type: 'FeatureCollection', features: [] }
            };
        }
    }
    httpGet(targetUrl) {
        return new Promise((resolve, reject) => {
            const req = https_1.default.get(targetUrl, { rejectUnauthorized: false, timeout: 20000 }, (res) => {
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
exports.BangkokGISAdapter = BangkokGISAdapter;
