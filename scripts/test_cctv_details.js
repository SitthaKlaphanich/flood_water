const http = require('http');

async function testProxy(url) {
  return new Promise((resolve) => {
    http.get(`http://localhost:5001/api/cctv/proxy-image?url=${encodeURIComponent(url)}`, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const buf = Buffer.concat(data);
        resolve({
          statusCode: res.statusCode,
          contentType: res.headers['content-type'],
          length: buf.length,
          previewHex: buf.subarray(0, 16).toString('hex'),
          previewText: buf.toString('utf8', 0, 100)
        });
      });
    }).on('error', (err) => resolve({ error: err.message }));
  });
}

async function inspectCCTVs() {
  const cctvRes = await new Promise((resolve, reject) => {
    http.get('http://localhost:5001/api/cctv', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });

  const bmaCameras = cctvRes.data.filter(c => c.id.startsWith('cctv_bma_'));
  const floodCameras = cctvRes.data.filter(c => c.id.startsWith('cctv_flood_'));

  console.log(`BMA Traffic Cameras: ${bmaCameras.length}`);
  console.log(`Flood Cameras: ${floodCameras.length}`);

  console.log('\nTesting BMA Traffic camera #603 snapshot proxy:');
  const res603 = await testProxy('http://www.bmatraffic.com/show.aspx?image=603');
  console.log('Result 603:', res603);

  console.log('\nTesting BMA Traffic camera #1286 snapshot proxy:');
  const res1286 = await testProxy('http://www.bmatraffic.com/show.aspx?image=1286');
  console.log('Result 1286:', res1286);

  console.log('\nSample 3 Flood Cameras:');
  console.log(JSON.stringify(floodCameras.slice(0, 3), null, 2));

  console.log('\nSample 3 BMA Traffic Cameras:');
  console.log(JSON.stringify(bmaCameras.slice(0, 3), null, 2));
}

inspectCCTVs().catch(console.error);
