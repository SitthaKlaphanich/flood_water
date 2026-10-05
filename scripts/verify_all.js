const http = require('http');

async function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:5001${path}`, (res) => {
      let data = [];
      res.on('data', c => data.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(data);
        const text = buf.toString('utf8');
        try {
          resolve({ status: res.statusCode, headers: res.headers, json: JSON.parse(text), length: buf.length });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, text, length: buf.length });
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('--- 1. Testing System Status ---');
  const sys = await get('/api/system/status');
  console.log('Status code:', sys.status);
  console.log('Counts:', sys.json.counts);

  console.log('\n--- 2. Testing CCTV Proxy Rate Limiting & Blank Detection ---');
  const cctvUrl = '/api/cctv/proxy-image?url=http%3A%2F%2Fwww.bmatraffic.com%2Fshow.aspx%3Fimage%3D603';
  const fetch1 = await get(cctvUrl);
  console.log('Fetch 1 - Status:', fetch1.status, 'Cache:', fetch1.headers['x-cache-status'], 'Blank:', fetch1.headers['x-image-blank'], 'Bytes:', fetch1.headers['x-image-bytes']);
  
  const fetch2 = await get(cctvUrl);
  console.log('Fetch 2 (Immediate) - Status:', fetch2.status, 'Cache:', fetch2.headers['x-cache-status'], 'Blank:', fetch2.headers['x-image-blank'], 'Bytes:', fetch2.headers['x-image-bytes']);

  console.log('\n--- 3. Testing Flood Point History Endpoint ---');
  const hist = await get('/api/flood-points/flood_742/history?hours=24');
  console.log('Flood Point History status:', hist.status);
  console.log('Flood Point History summary:', {
    stationId: hist.json.stationId,
    periodHours: hist.json.periodHours,
    trend: hist.json.trend,
    firstRecordedAt: hist.json.firstRecordedAt,
    count: hist.json.count,
    hasEnoughData: hist.json.hasEnoughData
  });

  console.log('\n--- 4. Testing Frontend Production HTML Serving ---');
  const fe = await get('/');
  console.log('Frontend index.html status:', fe.status, 'Length:', fe.length);
  const hasAppDiv = fe.text.includes('<div id="root">');
  console.log('Has root div:', hasAppDiv);

  console.log('\nAll automated backend checks complete!');
}

runTests().catch(console.error);
