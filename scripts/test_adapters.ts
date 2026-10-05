import { BangkokFloodAdapter } from '../backend/src/adapters/BangkokFloodAdapter';
import { BangkokWaterLevelAdapter } from '../backend/src/adapters/BangkokWaterLevelAdapter';
import { BangkokRainfallAdapter } from '../backend/src/adapters/BangkokRainfallAdapter';
import { BangkokCCTVAdapter } from '../backend/src/adapters/BangkokCCTVAdapter';
import { BangkokAlertAdapter } from '../backend/src/adapters/BangkokAlertAdapter';
import { WeatherAdapter } from '../backend/src/adapters/WeatherAdapter';

async function runTests() {
  console.log('========================================================');
  console.log('🧪 Testing Official Bangkok Flood Monitor Adapters');
  console.log('========================================================\n');

  const adapters = [
    new BangkokFloodAdapter(),
    new BangkokWaterLevelAdapter(),
    new BangkokRainfallAdapter(),
    new BangkokCCTVAdapter(),
    new BangkokAlertAdapter(),
    new WeatherAdapter()
  ];

  let passed = 0;
  let failed = 0;

  for (const adapter of adapters) {
    process.stdout.write(`Testing: ${adapter.name}... `);
    const start = performance.now();
    try {
      const data: any = await adapter.fetch();
      const count = Array.isArray(data) ? data.length : 1;
      const duration = (performance.now() - start).toFixed(0);
      console.log(`✅ OK (${count} records, ${duration}ms)`);
      if (Array.isArray(data) && data.length > 0) {
        console.log(`   Sample:`, JSON.stringify({
          id: data[0].id,
          name: data[0].name,
          source: data[0].source
        }));
      }
      passed++;
    } catch (err: any) {
      console.log(`❌ FAILED: ${err.message}`);
      failed++;
    }
    console.log('');
  }

  console.log('========================================================');
  console.log(`Summary: ${passed} passed, ${failed} failed.`);
  console.log('========================================================');

  if (failed > 0) process.exit(1);
}

runTests();
