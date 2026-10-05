const https = require('https');

https.get('https://floodbangkok.bangkok.go.th/', {
  rejectUnauthorized: false,
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
}, (res) => {
  let html = '';
  res.on('data', c => html += c);
  res.on('end', () => {
    console.log('floodbangkok homepage length:', html.length);
    // Find script tags
    const scripts = html.match(/src="([^"]+)"/g) || [];
    console.log('Script tags:', scripts);
    // Find mentions of cctv or camera
    const cctvMatches = html.match(/.{0,50}(?:cctv|camera|stream|video).{0,50}/gi) || [];
    console.log('CCTV mentions in HTML:', cctvMatches.slice(0, 10));
  });
});
