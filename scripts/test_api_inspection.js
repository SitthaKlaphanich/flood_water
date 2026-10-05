const http = require('http');

async function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:5001${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data, status: res.statusCode, headers: res.headers });
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('Testing System Status:');
  const status = await get('/api/system/status');
  console.log('System Status:', JSON.stringify(status, null, 2));

  console.log('\nTesting CCTV:');
  const cctv = await get('/api/cctv');
  console.log('CCTV count:', cctv.count);
  if (cctv.data && cctv.data.length > 0) {
    console.log('Sample 3 CCTVs:');
    console.log(JSON.stringify(cctv.data.slice(0, 3), null, 2));
    
    // Check distribution of stream types and sources
    const sources = {};
    const streamTypes = {};
    for (const c of cctv.data) {
      sources[c.source] = (sources[c.source] || 0) + 1;
      streamTypes[c.streamType] = (streamTypes[c.streamType] || 0) + 1;
    }
    console.log('CCTV sources:', sources);
    console.log('CCTV streamTypes:', streamTypes);
  }

  console.log('\nTesting Flood Points:');
  const floods = await get('/api/flood-points');
  console.log('Flood Points count:', floods.count);

  console.log('\nTesting Water Levels:');
  const water = await get('/api/water-levels');
  console.log('Water Levels count:', water.count);

  console.log('\nTesting Rainfall:');
  const rain = await get('/api/rainfall');
  console.log('Rainfall count:', rain.count);
}

main().catch(console.error);
