const https = require('https');
const http = require('http');

async function testUrl(targetUrl) {
  return new Promise((resolve) => {
    const isHttps = targetUrl.startsWith('https');
    const mod = isHttps ? https : http;
    const req = mod.get(targetUrl, {
      rejectUnauthorized: false,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': targetUrl
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          url: targetUrl,
          statusCode: res.statusCode,
          headers: res.headers,
          dataLength: data.length,
          preview: data.substring(0, 500)
        });
      });
    });
    req.on('error', (e) => resolve({ url: targetUrl, error: e.message }));
  });
}

async function main() {
  console.log('Testing cpudapp.bangkok.go.th/bmatraffic/ :');
  const res1 = await testUrl('https://cpudapp.bangkok.go.th/bmatraffic/');
  console.log(res1);

  console.log('\nTesting bmatraffic.com/PlayVideo.aspx?ID=603 :');
  const res2 = await testUrl('http://www.bmatraffic.com/PlayVideo.aspx?ID=603');
  console.log(res2);

  console.log('\nTesting bmatraffic.com other camera images:');
  for (const id of [1, 2, 10, 50, 100, 200, 603, 1000]) {
    const imgRes = await new Promise((resolve) => {
      http.get(`http://www.bmatraffic.com/show.aspx?image=${id}`, (res) => {
        let len = 0;
        res.on('data', c => len += c.length);
        res.on('end', () => resolve({ id, statusCode: res.statusCode, length: len }));
      }).on('error', (e) => resolve({ id, error: e.message }));
    });
    console.log(`Camera ${id}:`, imgRes);
  }
}

main().catch(console.error);
