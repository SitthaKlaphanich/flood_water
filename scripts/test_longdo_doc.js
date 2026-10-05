const https = require('https');

https.get('https://api.longdo.com/map/doc/rest.php', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('Doc length:', d.length);
    const matches = d.match(/.{0,50}(?:camera|cctv).{0,50}/gi) || [];
    console.log('Matches:', matches);
  });
}).on('error', e => console.error(e.message));
