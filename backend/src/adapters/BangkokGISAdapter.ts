import https from 'https';
import { BaseAdapter } from './BaseAdapter';

export interface GISFeatureCollection {
  type: 'FeatureCollection';
  features: any[];
}

export class BangkokGISAdapter extends BaseAdapter<{ districts: GISFeatureCollection; canals: GISFeatureCollection }> {
  readonly name = 'ข้อมูลภูมิสารสนเทศ กทม. (BMA GIS Districts & Canals)';
  readonly key = 'bangkok_gis';
  readonly url = 'https://bmasedgis.bangkok.go.th/sedgis/rest/services/Hosted/bma_district/FeatureServer/0';

  private cachedDistricts: GISFeatureCollection | null = null;
  private cachedCanals: GISFeatureCollection | null = null;

  async fetch(): Promise<{ districts: GISFeatureCollection; canals: GISFeatureCollection }> {
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
        } catch (e: any) {
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
    } catch (err: any) {
      this.updateHealthFailure(err.message, performance.now() - start);
      return {
        districts: this.cachedDistricts || { type: 'FeatureCollection', features: [] },
        canals: this.cachedCanals || { type: 'FeatureCollection', features: [] }
      };
    }
  }

  private httpGet(targetUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = https.get(targetUrl, { rejectUnauthorized: false, timeout: 20000 }, (res) => {
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
