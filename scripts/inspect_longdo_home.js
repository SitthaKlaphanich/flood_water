const https = require('https');

https.get('https://traffic.longdo.com/', {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
}, (res) => {
  let html = '';
  res.on('data', c => html += c);
  res.on('end', () => {
    console.log('HTML length:', html.length);
    // Find all script tags or api references
    const scripts = html.match(/src="([^"]+)"/g) || [];
    console.log('Scripts:', scripts);
    const apis = html.match(/https?:\/\/[^"'\s]+/g) || [];
    const uniqueApis = [...new Set(apis)].filter(u => u.includes('api') || u.includes('camera') || u.includes('cctv') || u.includes('longdo'));
    console.log('Relevant URLs:', uniqueApis);
  });
});
