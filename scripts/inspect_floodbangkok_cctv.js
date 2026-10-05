const https = require('https');

async function testHttps(url) {
  return new Promise((resolve) => {
    https.get(url, { rejectUnauthorized: false }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ status: res.statusCode, data: data.substring(0, 500) });
        }
      });
    }).on('error', (e) => resolve({ error: e.message }));
  });
}

async function main() {
  console.log('1. Checking Directus camera_profile on floodbangkok:');
  const cameras = await testHttps('https://floodbangkok.bangkok.go.th/bkk/dds/services/api/floods/v1/items/camera_profile?limit=10');
  console.log('Cameras:', JSON.stringify(cameras, null, 2));

  console.log('\n2. Checking other CCTV endpoints on floodbangkok or BMA:');
  // Check Directus collections
  const collections = await testHttps('https://floodbangkok.bangkok.go.th/bkk/dds/services/api/floods/v1/collections');
  if (collections.data) {
    console.log('Collections available:', collections.data.map(c => c.collection));
  } else {
    console.log('Collections response:', collections);
  }
}

main().catch(console.error);
