const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
test('serves application assets and rejects unknown paths', async()=>{
 const child=spawn(process.execPath,['server.js'],{cwd:__dirname,env:{...process.env,PORT:'3199'}});
 try {
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',code=>reject(Error('Server exited '+code)));});
  for(const [url,type,needle] of [['/','text/html','Guitar Studio'],['/app.js','text/javascript','practice-form'],['/style.css','text/css','@media']]){
   const response=await fetch('http://127.0.0.1:3199'+url);assert.equal(response.status,200);assert.ok(response.headers.get('content-type').includes(type));assert.ok((await response.text()).includes(needle));
  }
  const image=await fetch('http://127.0.0.1:3199/music/notes-on-the-first-string.png');
  assert.equal(image.status,200);
  assert.equal(image.headers.get('content-type'),'image/png');
  assert.equal(Buffer.from(await image.arrayBuffer()).subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const pdf=await fetch('http://127.0.0.1:3199/music/notes-on-the-first-string.pdf');
  assert.equal(pdf.status,200);
  assert.equal(pdf.headers.get('content-type'),'application/pdf');
  assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0,5).toString(),'%PDF-');
  assert.equal((await fetch('http://127.0.0.1:3199/missing')).status,404);
 } finally {child.kill();}
});
