const https = require('https');

https.get('https://floodbangkok.bangkok.go.th/_next/static/chunks/4363-29c9f0a233316a87.js', { rejectUnauthorized: false }, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const idx = d.indexOf('liveStreamUrl');
    if (idx !== -1) {
      console.log('Context around liveStreamUrl:');
      console.log(d.substring(idx - 100, idx + 1000));
    }
  });
});
