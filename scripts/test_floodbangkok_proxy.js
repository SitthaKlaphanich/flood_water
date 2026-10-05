const https = require('https');

const rtcUrl = 'https://rtc-bkk-bma-hk-1-11.larry-cctv.com/api/stream.mp4?src=AC-DD-2-B-C1&mp4=flac';
const testUrl = `https://floodbangkok.bangkok.go.th/api/proxy?rtcUrl=${encodeURIComponent(rtcUrl)}&timestamp=${Date.now()}`;

console.log('Testing URL:', testUrl);

https.get(testUrl, {
  rejectUnauthorized: false,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'Referer': 'https://floodbangkok.bangkok.go.th/'
  }
}, (res) => {
  console.log('Status code:', res.statusCode);
  console.log('Headers:', res.headers);
  let bytes = 0;
  const chunks = [];
  res.on('data', c => {
    bytes += c.length;
    chunks.push(c);
  });
  res.on('end', () => {
    const buf = Buffer.concat(chunks);
    console.log('Total bytes:', bytes);
    console.log('First 32 bytes hex:', buf.subarray(0, 32).toString('hex'));
    console.log('First 100 bytes text:', buf.toString('utf8', 0, 100));
  });
}).on('error', e => console.error('Error:', e.message));
