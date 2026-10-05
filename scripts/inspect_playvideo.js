const http = require('http');

http.get('http://www.bmatraffic.com/PlayVideo.aspx?ID=603', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('PlayVideo.aspx?ID=603 content:');
    console.log(data);
  });
});
