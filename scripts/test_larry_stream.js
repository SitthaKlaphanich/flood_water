const https = require('https');

https.get('https://rtc-bkk-bma-hk-1-11.larry-cctv.com/api/stream.mp4?src=AC-DD-2-B-C1&mp4=flac', {
  rejectUnauthorized: false
}, (res) => {
  console.log('Status code:', res.statusCode);
  console.log('Headers:', res.headers);
  let bytes = 0;
  res.on('data', chunk => {
    bytes += chunk.length;
    if (bytes > 50000) {
      console.log(`Received > 50KB data (streaming active)! Total bytes received so far: ${bytes}`);
      res.destroy();
    }
  });
  res.on('end', () => console.log('Stream ended. Total bytes:', bytes));
}).on('error', e => console.error('Error:', e.message));
