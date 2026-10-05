const https = require('https');

async function test(url) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, length: d.length, preview: d.substring(0, 500) }));
    }).on('error', e => resolve({ error: e.message }));
  });
}

async function main() {
  console.log('Testing traffic.longdo.com/cctv:');
  console.log(await test('https://traffic.longdo.com/cctv'));
}

main();
