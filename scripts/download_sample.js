const fs = require('fs');
const http = require('http');

http.get('http://www.bmatraffic.com/show.aspx?image=603', (res) => {
  const chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', () => {
    const buf = Buffer.concat(chunks);
    fs.writeFileSync('/Users/sittha/Code/flood_water/scripts/sample_603.png', buf);
    console.log('Saved sample_603.png, size:', buf.length);
  });
});
