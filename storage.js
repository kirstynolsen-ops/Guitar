const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const levels=['beginning','intermediate','advanced'];
const categories=['single','combining','chords','ensemble'];
function metadata(body){
 if(typeof body.title!=='string'||!body.title.trim()||body.title.length>120)throw Error('Enter a title of 1–120 characters.');
 if(!levels.includes(body.level)||!categories.includes(body.category))throw Error('Choose a class and skill group.');
 if(typeof body.skills!=='string'||body.skills.length>300)throw Error('Keep skill tags under 300 characters.');
 return {title:body.title.trim(),level:body.level,category:body.category,skills:body.skills.split(',').map(s=>s.trim()).filter(Boolean).slice(0,10),current:body.current==='true'};
}
async function identify(file){const handle=await fs.open(file.path,'r');try{const b=Buffer.alloc(12);await handle.read(b,0,12,0);if(b.subarray(0,5).toString()==='%PDF-')return 'pdf';if(b.subarray(0,8).toString('hex')==='89504e470d0a1a0a')return 'png';if(b.subarray(0,3).toString('hex')==='ffd8ff')return 'jpg';throw Error('Only PDF, PNG and JPEG music files are supported.');}finally{await handle.close();}}
async function createStore(directory,seed=[]){
 await fs.mkdir(directory,{recursive:true,mode:0o700});
 const catalogPath=path.join(directory,'catalog.json');let pieces=[];
 try{pieces=JSON.parse(await fs.readFile(catalogPath,'utf8'));if(!Array.isArray(pieces))throw Error('Invalid catalog');}catch(e){if(e.code!=='ENOENT')throw e;pieces=structuredClone(seed);await fs.writeFile(catalogPath,JSON.stringify(pieces,null,2),{mode:0o600});}
 let queue=Promise.resolve();
 function mutate(change){const task=queue.then(async()=>{const updated=change(pieces);const temp=catalogPath+'.'+crypto.randomUUID()+'.tmp';try{await fs.writeFile(temp,JSON.stringify(updated,null,2),{mode:0o600});await fs.rename(temp,catalogPath);}catch(e){await fs.rm(temp,{force:true});throw e;}pieces=updated;return pieces;});queue=task.catch(()=>{});return task;}
 return {directory,list:()=>structuredClone(pieces),
 async add(body,files){const data=metadata(body);const original=files.filter(f=>f.fieldname==='music');const previews=files.filter(f=>f.fieldname==='pages');if(original.length!==1)throw Error('Choose exactly one music file.');const type=await identify(original[0]);if(type==='pdf'&&(previews.length<1||previews.length>10))throw Error('A PDF needs 1–10 preview pages.');if(type!=='pdf'&&previews.length)throw Error('Image uploads do not need extra previews.');for(const preview of previews)if(await identify(preview)!=='png')throw Error('PDF preview pages must be PNG images.');
 const id=crypto.randomUUID(),folder=path.join(directory,id);await fs.mkdir(folder,{mode:0o700});
 try{const sourceName='original.'+type;await fs.copyFile(original[0].path,path.join(folder,sourceName));const images=[];
 if(type==='pdf'){for(let i=0;i<previews.length;i++){const name=`page-${i+1}.png`;await fs.copyFile(previews[i].path,path.join(folder,name));images.push(`/uploads/${id}/${name}`);}}
 else images.push(`/uploads/${id}/${sourceName}`);
 const piece={...data,id,uploaded:true,images,image:images[0],pdf:type==='pdf'?`/uploads/${id}/${sourceName}`:null,source:`/uploads/${id}/${sourceName}`,createdAt:new Date().toISOString()};await mutate(items=>[...items,piece]);return piece;
 }catch(e){await fs.rm(folder,{recursive:true,force:true});throw e;}},
 async update(id,body){const data=metadata(body);await mutate(items=>{if(!items.some(p=>p.id===id))throw Error('Piece not found.');return items.map(p=>p.id===id?{...p,...data}:p);});return pieces.find(p=>p.id===id);},
 async remove(id){await mutate(items=>{if(!items.some(p=>p.id===id))throw Error('Piece not found.');return items.filter(p=>p.id!==id);});await fs.rm(path.join(directory,id),{recursive:true,force:true});},
 file(id,name){const piece=pieces.find(p=>p.id===id);if(!piece)return null;const url=`/uploads/${id}/${name}`;if(![piece.source,...(piece.images||[])].includes(url))return null;return path.join(directory,id,name);}
 };
}
module.exports={createStore,metadata,identify};
