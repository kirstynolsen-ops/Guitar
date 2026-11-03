const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const server = http.createServer((req,res) => {
  const files = {'/':'index.html','/app.js':'app.js','/rhythm.js':'rhythm.js','/style.css':'style.css','/music/notes-on-the-first-string.png':'music/notes-on-the-first-string.png','/music/notes-on-the-first-string.pdf':'music/notes-on-the-first-string.pdf'};
  const file = files[new URL(req.url,'http://localhost').pathname];
  if (!file) {res.writeHead(404);res.end('Not found');return;}
  res.setHeader('Content-Type',file.endsWith('.png')?'image/png':file.endsWith('.pdf')?'application/pdf':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');
  res.setHeader('X-Content-Type-Options','nosniff');
  fs.createReadStream(path.join(root,file)).pipe(res);
});
server.listen(process.env.PORT || 3000,'0.0.0.0',()=>console.log('Guitar classroom running on port '+(process.env.PORT || 3000)));
