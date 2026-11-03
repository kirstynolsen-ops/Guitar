const crypto=require('node:crypto');
class FakeDrive{
 constructor(){this.files=new Map();this.failNextReplace=false;}
 async create(name,parent,mimeType,data,appProperties={}){const id=crypto.randomUUID();this.files.set(id,{id,name,parent,mimeType,data:data||Buffer.alloc(0),size:String(data?.length||0),appProperties,trashed:false});return {id};}
 async info(id){const file=this.files.get(id);if(!file)throw Error('Not found');return {...file};}
 async list(query){const parent=query.match(/^'([^']+)'/)?.[1];return [...this.files.values()].filter(f=>f.parent===parent&&!f.trashed&&f.appProperties.guitarStudio==='catalog');}
 async read(id){const file=await this.info(id);if(file.trashed)throw Error('Not found');return Buffer.from(file.data);}
 async replace(id,data){if(this.failNextReplace){this.failNextReplace=false;throw Error('Simulated Drive outage');}const f=await this.info(id);this.files.set(id,{...f,data:Buffer.from(data)});return {id};}
 async trash(id){this.files.get(id).trashed=true;}
 async accessToken(){return 'test-access-token';}
}
module.exports={FakeDrive};
