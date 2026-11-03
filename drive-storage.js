const crypto=require('node:crypto');
const fs=require('node:fs/promises');
const {OAuth2Client}=require('google-auth-library');
const {metadata,identify}=require('./storage');
const FOLDER='application/vnd.google-apps.folder';
function driveClient(env){
 const auth=new OAuth2Client(env.GOOGLE_CLIENT_ID,env.GOOGLE_CLIENT_SECRET);
 auth.setCredentials({refresh_token:env.GOOGLE_DRIVE_REFRESH_TOKEN});
 const request=async(url,options={})=>(await auth.request({url,...options})).data;
 return {
  async info(id){return request('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?fields=id,name,mimeType,size,trashed');},
  async list(query){const all=[];let token='';do{const params=new URLSearchParams({q:query,fields:'nextPageToken,files(id,name,mimeType,size,modifiedTime,appProperties)',pageSize:'100',...(token?{pageToken:token}:{})});const data=await request('https://www.googleapis.com/drive/v3/files?'+params);all.push(...(data.files||[]));token=data.nextPageToken||'';}while(token);return all;},
  async read(id){return Buffer.from(await request('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?alt=media',{responseType:'arraybuffer'}));},
  async create(name,parent,mimeType,bytes,properties={}){const meta={name,mimeType,...(parent?{parents:[parent]}:{}),appProperties:properties};if(!bytes)return request('https://www.googleapis.com/drive/v3/files?fields=id',{method:'POST',data:meta});const boundary='guitar-'+crypto.randomUUID();const data=Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),bytes,Buffer.from(`\r\n--${boundary}--\r\n`)]);return request('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},data});},
  async replace(id,bytes){return request('https://www.googleapis.com/upload/drive/v3/files/'+encodeURIComponent(id)+'?uploadType=media',{method:'PATCH',headers:{'Content-Type':'application/json'},data:bytes});},
  async trash(id){return request('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id),{method:'PATCH',data:{trashed:true}});},
  async accessToken(){return (await auth.getAccessToken()).token;}
 };
}
async function provisionDrive(client,seed){const folder=await client.create('Guitar Studio Music',null,FOLDER,null,{guitarStudio:'folder'});const catalog=await client.create('Guitar Studio Library.json',folder.id,'application/json',Buffer.from(JSON.stringify(seed)),{guitarStudio:'catalog'});return {folderId:folder.id,catalogId:catalog.id};}
function validateCatalog(items){
 if(!Array.isArray(items)||items.length>5000)throw Error('The Drive library catalog is invalid.');
 const ids=new Set();
 for(const piece of items){
  if(!piece||typeof piece.id!=='string'||!/^[a-zA-Z0-9-]+$/.test(piece.id)||ids.has(piece.id))throw Error('Invalid piece identifier in Drive catalog.');ids.add(piece.id);
  metadata({...piece,skills:Array.isArray(piece.skills)?piece.skills.join(','):null,current:String(piece.current)});
  const urls=[piece.image,...(piece.images||[]),piece.source,piece.pdf].filter(Boolean);
  if(!urls.length||urls.some(url=>typeof url!=='string'||!(/^\/music\/[a-zA-Z0-9-]+\.(png|jpg|pdf)$/.test(url)||url.startsWith('/uploads/'+piece.id+'/')&&/^\/uploads\/[a-zA-Z0-9-]+\/(original\.(pdf|png|jpg)|page-[0-9]+\.png)$/.test(url))))throw Error('Invalid music path in Drive catalog.');
  if(piece.driveFiles&&Object.entries(piece.driveFiles).some(([name,id])=>!(/^(original\.(pdf|png|jpg)|page-[0-9]+\.png)$/.test(name))||typeof id!=='string'||!/^[a-zA-Z0-9_-]+$/.test(id)))throw Error('Invalid Drive file reference.');
 }
 return items;
}
function createDriveStore(client,folderId,seed){
 if(!/^[a-zA-Z0-9_-]+$/.test(folderId))throw Error('Invalid Drive folder ID.');
 let catalogId=null,cache=null,cacheUntil=0,queue=Promise.resolve();
 async function load(force=false){if(!force&&cache&&Date.now()<cacheUntil)return structuredClone(cache);if(!catalogId){const info=await client.info(folderId);if(info.trashed||info.mimeType!==FOLDER)throw Error('The Drive music folder is unavailable.');const candidates=await client.list(`'${folderId}' in parents and trashed = false and appProperties has { key='guitarStudio' and value='catalog' }`);if(candidates.length!==1)throw Error('The Drive library catalog is missing or ambiguous. Reconnect the original folder.');catalogId=candidates[0].id;}
 const items=JSON.parse((await client.read(catalogId)).toString());validateCatalog(items);cache=items;cacheUntil=Date.now()+30000;return structuredClone(cache);}
 function mutate(change){const task=queue.then(async()=>{const items=await load(true),updated=change(items);await client.replace(catalogId,Buffer.from(JSON.stringify(updated,null,2)));cache=updated;cacheUntil=Date.now()+30000;return structuredClone(updated);});queue=task.catch(()=>{});return task;}
 const publicPiece=piece=>{const {driveFiles,...rest}=piece;return rest;};
 return {
  provider:'drive',async list(){return (await load()).map(publicPiece);},
  async add(body,files){const data=metadata(body),originals=files.filter(f=>f.fieldname==='music'),previews=files.filter(f=>f.fieldname==='pages');if(originals.length!==1)throw Error('Choose exactly one music file.');const type=await identify(originals[0]);if(type==='pdf'&&(previews.length<1||previews.length>10))throw Error('A PDF needs 1–10 preview pages.');if(type!=='pdf'&&previews.length)throw Error('Image uploads do not need extra previews.');for(const preview of previews)if(await identify(preview)!=='png')throw Error('PDF preview pages must be PNG images.');const id=crypto.randomUUID(),created=[],driveFiles={},images=[];let piece,attemptedWrite=false;const mime={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg'};
  try{const sourceName='original.'+type;const source=await client.create(data.title+'.'+type,folderId,mime[type],await fs.readFile(originals[0].path),{guitarStudio:'source',pieceId:id});created.push(source.id);driveFiles[sourceName]=source.id;if(type==='pdf')for(let i=0;i<previews.length;i++){const name=`page-${i+1}.png`;const page=await client.create(`${data.title} - page ${i+1}.png`,folderId,'image/png',await fs.readFile(previews[i].path),{guitarStudio:'preview',pieceId:id});created.push(page.id);driveFiles[name]=page.id;images.push(`/uploads/${id}/${name}`);}else images.push(`/uploads/${id}/${sourceName}`);
  piece={...data,id,uploaded:true,images,image:images[0],pdf:type==='pdf'?`/uploads/${id}/${sourceName}`:null,source:`/uploads/${id}/${sourceName}`,driveFiles,createdAt:new Date().toISOString()};attemptedWrite=true;await mutate(items=>[...items,piece]);return publicPiece(piece);
  }catch(e){if(attemptedWrite){try{const confirmed=(await load(true)).find(item=>item.id===id);if(confirmed)return publicPiece(confirmed);}catch{throw e;}}await Promise.allSettled(created.map(id=>client.trash(id)));throw e;}},
  async update(id,body){const data=metadata(body);const items=await mutate(items=>{if(!items.some(p=>p.id===id))throw Error('Piece not found.');return items.map(p=>p.id===id?{...p,...data}:p);});return publicPiece(items.find(p=>p.id===id));},
  async remove(id){await mutate(items=>{if(!items.some(p=>p.id===id))throw Error('Piece not found.');return items.filter(p=>p.id!==id);});/* Keep Drive files as a recoverable archive; only unpublish from the app. */},
  async file(id,name){const piece=(await load()).find(p=>p.id===id);if(!piece?.driveFiles||!Object.hasOwn(piece.driveFiles,name))return null;return {data:await client.read(piece.driveFiles[name]),type:name.endsWith('.pdf')?'application/pdf':name.endsWith('.png')?'image/png':'image/jpeg',download:name.endsWith('.pdf')};},
  async importSource(id){if(!/^[a-zA-Z0-9_-]+$/.test(id))throw Error('Invalid Drive file.');const info=await client.info(id);if(info.trashed||!['application/pdf','image/png','image/jpeg'].includes(info.mimeType)||Number(info.size)>12*1024*1024||!info.size)throw Error('Choose a PDF, PNG or JPEG up to 12 MB.');const data=await client.read(id);if(data.length>12*1024*1024)throw Error('File exceeds 12 MB.');return {data,type:info.mimeType,name:info.name};}
 };
}
module.exports={driveClient,provisionDrive,createDriveStore};
