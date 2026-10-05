import https from 'https';
import { BaseAdapter } from './BaseAdapter';
import { WeatherData } from '../types/models';

export class WeatherAdapter extends BaseAdapter<WeatherData> {
  readonly name = 'สภาพอากาศและกลุ่มฝนกรุงเทพฯ (Bangkok Weather & Rain)';
  readonly key = 'bangkok_weather';
  readonly url = 'https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m&timezone=Asia%2FBangkok';

  async fetch(): Promise<WeatherData> {
    const start = performance.now();
    try {
      const response = await this.httpGet(this.url);
      const json = JSON.parse(response);

      if (!json.current) {
        throw new Error('Invalid Open-Meteo response format');
      }

      const cur = json.current;
      const weather: WeatherData = {
        time: cur.time,
        temperature: Number(cur.temperature_2m) || 0,
        humidity: Number(cur.relative_humidity_2m) || 0,
        rain: Number(cur.rain) || 0,
        precipitation: Number(cur.precipitation) || 0,
        weatherCode: Number(cur.weather_code) || 0,
        windSpeed: Number(cur.wind_speed_10m) || 0,
        source: 'Open-Meteo Weather API'
      };

      this.updateHealthSuccess(1, performance.now() - start);
      return weather;
    } catch (err: any) {
      this.updateHealthFailure(err.message, performance.now() - start);
      throw err;
    }
  }

  private httpGet(targetUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = https.get(targetUrl, { timeout: 10000 }, (res) => {
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
