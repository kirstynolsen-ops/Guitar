const express=require('express');
const multer=require('multer');
const crypto=require('node:crypto');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {OAuth2Client}=require('google-auth-library');
const {createStore}=require('./storage');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
function cookie(req,name){return (req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1);}
async function createApplication(options={}){
 const env=options.env||process.env;const root=__dirname;
 const app=express();app.disable('x-powered-by');
 const appURL=env.APP_URL||'';let origin='';if(appURL){const parsed=new URL(appURL);if(parsed.pathname!=='/'||!['https:','http:'].includes(parsed.protocol))throw Error('APP_URL must be a website origin without a path.');if(parsed.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(parsed.hostname))throw Error('APP_URL must use HTTPS.');origin=parsed.origin;}
 const secure=origin.startsWith('https:');const emails=new Set((env.TEACHER_EMAILS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean));
 const configured=Boolean(origin&&env.GOOGLE_CLIENT_ID&&env.GOOGLE_CLIENT_SECRET&&emails.size);
 const storageConfigured=Boolean(env.DATA_DIR);const uploadReady=configured&&storageConfigured;
 const store=await createStore(path.resolve(env.DATA_DIR||path.join(root,'.local-data')),require('./music-library.json'));
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'guitar-upload-'));
 const oauth=options.oauthClient||new OAuth2Client(env.GOOGLE_CLIENT_ID,env.GOOGLE_CLIENT_SECRET,origin+'/auth/google/callback');
 const states=new Map(),sessions=new Map();
 const sweep=()=>{for(const map of [states,sessions])for(const [key,value] of map)if(value.expires<Date.now())map.delete(key);};const sweepTimer=setInterval(sweep,60000);sweepTimer.unref();
 function setCookie(res,name,value,maxAge){res.append('Set-Cookie',`${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure?'; Secure':''}`);}
 app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','SAMEORIGIN');next();});
 app.use('/api',(_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
 app.use(express.json({limit:'8kb'}));
 function teacher(req,res,next){const token=cookie(req,'guitar_session');const session=token&&sessions.get(hash(token));if(!session||session.expires<Date.now()||!emails.has(session.email))return res.status(401).json({error:'Sign in with an approved teacher account.'});req.teacher=session;next();}
 function sameOrigin(req,res,next){if(!origin||req.headers.origin!==origin)return res.status(403).json({error:'This request must come from your Guitar Studio website.'});next();}
 app.get('/api/session',(req,res)=>{const token=cookie(req,'guitar_session');const session=token&&sessions.get(hash(token));const valid=session&&session.expires>Date.now()&&emails.has(session.email);res.json({configured,storageConfigured,uploadReady,teacher:valid?{email:session.email}:null});});
 app.get('/auth/google',(req,res)=>{res.setHeader('Cache-Control','no-store');if(!configured)return res.redirect('/?auth=setup');sweep();if(states.size>500)return res.status(429).send('Please try signing in again in a few minutes.');const state=crypto.randomBytes(32).toString('hex'),binding=crypto.randomBytes(32).toString('hex'),verifier=crypto.randomBytes(48).toString('base64url'),nonce=crypto.randomBytes(32).toString('hex');states.set(state,{binding:hash(binding),verifier,nonce,expires:Date.now()+600000});setCookie(res,'guitar_oauth',binding,600);res.redirect(oauth.generateAuthUrl({scope:['openid','email'],state,nonce,code_challenge:crypto.createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',access_type:'online',prompt:'select_account'}));});
 app.get('/auth/google/callback',async(req,res)=>{res.setHeader('Cache-Control','no-store');const {state,code}=req.query;const pending=typeof state==='string'&&states.get(state);if(typeof state==='string')states.delete(state);const binding=cookie(req,'guitar_oauth');setCookie(res,'guitar_oauth','',0);if(!configured||!pending||pending.expires<Date.now()||!binding||hash(binding)!==pending.binding||typeof code!=='string')return res.redirect('/?auth=failed');
 try{const {tokens}=await oauth.getToken({code,codeVerifier:pending.verifier,redirect_uri:origin+'/auth/google/callback'});if(!tokens.id_token)throw Error();const ticket=await oauth.verifyIdToken({idToken:tokens.id_token,audience:env.GOOGLE_CLIENT_ID});const payload=ticket.getPayload();const email=payload?.email?.toLowerCase();if(!payload?.email_verified||payload.nonce!==pending.nonce||!emails.has(email))return res.redirect('/?auth=denied');const token=crypto.randomBytes(32).toString('hex');sessions.set(hash(token),{email,expires:Date.now()+8*60*60*1000});setCookie(res,'guitar_session',token,8*60*60);res.redirect('/?auth=success');}catch{res.redirect('/?auth=failed');}});
 app.post('/api/logout',sameOrigin,(req,res)=>{const token=cookie(req,'guitar_session');if(token)sessions.delete(hash(token));setCookie(res,'guitar_session','',0);res.json({ok:true});});
 app.get('/api/repertoire',(_req,res)=>res.json(store.list()));
 app.get('/uploads/:id/:name',async(req,res,next)=>{const file=store.file(req.params.id,req.params.name);if(!file)return res.sendStatus(404);if(file.endsWith('.pdf'))res.setHeader('Content-Disposition','attachment; filename="music.pdf"');res.sendFile(file,err=>{if(err&&!res.headersSent)next(err);});});
 const upload=multer({dest:temp,limits:{fileSize:12*1024*1024,files:11,fields:6,fieldSize:1000,parts:17}}).fields([{name:'music',maxCount:1},{name:'pages',maxCount:10}]);
 app.post('/api/repertoire',sameOrigin,teacher,(req,res,next)=>{if(!uploadReady)return res.status(503).json({error:'Permanent storage must be configured before uploading.'});upload(req,res,async err=>{const files=Object.values(req.files||{}).flat();try{if(err)throw err;const piece=await store.add(req.body,files);res.status(201).json(piece);}catch(e){res.status(400).json({error:e instanceof multer.MulterError?'Upload limit exceeded. Use a PDF or image up to 12 MB and at most 10 PDF pages.':e.message.startsWith('E')?'The music could not be saved. Please try again.':e.message});}finally{await Promise.all(files.map(f=>fs.rm(f.path,{force:true})));}});});
 app.patch('/api/repertoire/:id',sameOrigin,teacher,async(req,res)=>{try{res.json(await store.update(req.params.id,req.body));}catch(e){res.status(400).json({error:'Check the piece title, class, skill group, and tags.'});}});
 app.delete('/api/repertoire/:id',sameOrigin,teacher,async(req,res)=>{try{await store.remove(req.params.id);res.json({ok:true});}catch{res.status(400).json({error:'The piece could not be removed.'});}});
 const assets=['index.html','app.js','teacher.js','click-track.js','rhythm.js','style.css'];for(const file of assets)app.get(file==='index.html'?'/':'/'+file,(_req,res)=>res.sendFile(path.join(root,file)));
 app.use('/music',express.static(path.join(root,'music'),{index:false,dotfiles:'deny'}));
 for(const file of ['pdf.mjs','pdf.worker.mjs'])app.get('/vendor/'+file,(_req,res)=>res.sendFile(path.join(root,'node_modules/pdfjs-dist/build',file)));
 app.use((err,req,res,next)=>{if(res.headersSent)return next(err);res.status(500).json({error:'The request could not be completed.'});});
 return {app,store,close:async()=>{clearInterval(sweepTimer);await fs.rm(temp,{recursive:true,force:true});}};
}
module.exports={createApplication};
