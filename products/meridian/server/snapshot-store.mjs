import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
const bucket=process.env.SNAPSHOT_BUCKET;
let cachedToken,expires=0;
export async function cloudToken(){
 if(process.env.GOOGLE_ACCESS_TOKEN)return process.env.GOOGLE_ACCESS_TOKEN;
 if(cachedToken&&Date.now()<expires)return cachedToken;
 const r=await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',{headers:{'Metadata-Flavor':'Google'},signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw Error('Cloud identity unavailable');const t=await r.json();cachedToken=t.access_token;expires=Date.now()+(t.expires_in-60)*1000;return cachedToken;
}
async function request(url,options={}){const r=await fetch(url,{...options,headers:{Authorization:`Bearer ${await cloudToken()}`,...options.headers},signal:AbortSignal.timeout(180000)});if(!r.ok&&r.status!==404)throw Error(`Snapshot storage ${r.status}`);return r;}
const objectUrl=name=>`https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(name)}`;
export async function latestSnapshot(){
 if(!bucket)return null;const r=await request(objectUrl('latest.json'));if(r.status===404)return null;const meta=await r.json();const body=await request(objectUrl('latest.json')+`?alt=media&generation=${meta.generation}`);return {...await body.json(),manifestGeneration:meta.generation};
}
export async function downloadSnapshot(manifest,path){
 const r=await request(objectUrl(manifest.object)+`?alt=media&generation=${manifest.objectGeneration}`);const bytes=Buffer.from(await r.arrayBuffer());if(createHash('sha256').update(bytes).digest('hex')!==manifest.sha256)throw Error('Snapshot checksum mismatch');await writeFile(path,bytes);
}
export async function publishSnapshot(path,schema,previous){
 if(!bucket)throw Error('SNAPSHOT_BUCKET is required');const bytes=await readFile(path),sha256=createHash('sha256').update(bytes).digest('hex'),object=`snapshots/${schema.period.end}-${sha256.slice(0,16)}.duckdb`;
 const upload=async(name,content,type,generation)=>{const url=`https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(name)}&ifGenerationMatch=${generation}`;const r=await request(url,{method:'POST',headers:{'Content-Type':type},body:content});return r.json();};
 let blob;const existing=await request(objectUrl(object));if(existing.ok)blob=await existing.json();else blob=await upload(object,bytes,'application/octet-stream',0);
 const manifest={object,objectGeneration:blob.generation,sha256,schema,publishedAt:new Date().toISOString()};await upload('latest.json',JSON.stringify(manifest),'application/json',previous?.manifestGeneration||0);return manifest;
}
