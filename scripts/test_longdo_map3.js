const https = require('https');

https.get('https://api.longdo.com/map3/?key=test', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('Map3 length:', d.length);
    // Find script src
    const scripts = d.match(/src="([^"]+)"/g) || [];
    console.log('Scripts in map3:', scripts);
  });
}).on('error', e => console.error(e.message));
