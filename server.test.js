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
  assert.equal((await fetch('http://127.0.0.1:3199/missing')).status,404);
 } finally {child.kill();}
});
