const https = require('https');

async function getChunk(path) {
  return new Promise((resolve) => {
    https.get(`https://floodbangkok.bangkok.go.th${path}`, { rejectUnauthorized: false }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', () => resolve(''));
  });
}

async function main() {
  const chunks = [
    '/_next/static/chunks/app/page-6b9aaf9a704beb1b.js',
    '/_next/static/chunks/294-724b551967144f2e.js',
    '/_next/static/chunks/8008-a632c1696970ffa6.js',
    '/_next/static/chunks/8083-afa7b83931ec8598.js',
    '/_next/static/chunks/726-9bb6c997221cfe0b.js',
    '/_next/static/chunks/2848-5f76866fdfb20903.js',
    '/_next/static/chunks/8963-a3063ea1e9bbafd5.js'
  ];

  for (const c of chunks) {
    const code = await getChunk(c);
    const matches = code.match(/.{0,40}(?:camera_profile|camera|LiveStream|stream\.mp4|hls|m3u8|cctv).{0,40}/gi) || [];
    if (matches.length > 0) {
      console.log(`Found in ${c}:`, matches.slice(0, 5));
    }
  }
}

main();
