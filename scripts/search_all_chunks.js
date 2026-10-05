const https = require('https');

async function get(url) {
  return new Promise((resolve) => {
    https.get(url, { rejectUnauthorized: false }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', () => resolve(''));
  });
}

async function main() {
  const html = await get('https://floodbangkok.bangkok.go.th/');
  const scripts = [...new Set(html.match(/src="(\/_next\/static\/chunks\/[^"]+)"/g) || [])].map(s => s.replace('src="', '').replace('"', ''));
  console.log(`Searching across ${scripts.length} chunks...`);

  for (const s of scripts) {
    const code = await get(`https://floodbangkok.bangkok.go.th${s}`);
    const matches = code.match(/.{0,40}(?:camera_profile|LiveStream|rtc-bkk|cctv|stream\.mp4).{0,40}/gi) || [];
    if (matches.length > 0) {
      console.log(`\nFound matches in ${s}:`);
      console.log(matches.slice(0, 5));
    }
  }
}

main();
