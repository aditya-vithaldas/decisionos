const origin=process.env.DUCKDB_URL||'https://liveanalyst-duckdb-648674198172.europe-west1.run.app';
let identity,expiry=0;
async function headers(){
 if(process.env.LOCAL_BACKEND==='1')return {};
 if(!identity||Date.now()>expiry){const r=await fetch(`http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(origin)}&format=full`,{headers:{'Metadata-Flavor':'Google'},signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('Service identity unavailable');identity=await r.text();expiry=Date.now()+45*60000;}
 return {Authorization:`Bearer ${identity}`};
}
export async function backend(path,body){const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{...await headers(),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});if(!r.ok){const detail=await r.json().catch(()=>({}));throw Error(`Database request failed (${r.status}): ${detail.error||'Unavailable'}`);}return r.json();}
export const sqlQuery=sql=>backend('/query',{sql});
