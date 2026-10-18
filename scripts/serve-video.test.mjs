import test from 'node:test';import assert from 'node:assert/strict';import {createServer} from 'node:http';import {mkdtemp,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {serveVideo} from './serve-video.mjs';
test('video supports seek ranges, suffix ranges, HEAD and invalid ranges',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'asana-video-')),path=join(dir,'test.mp4');await writeFile(path,Buffer.from('0123456789'));
 const server=createServer((req,res)=>serveVideo(req,res,path));await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
 try{
  let r=await fetch(url,{headers:{Range:'bytes=2-5'}});assert.equal(r.status,206);assert.equal(r.headers.get('content-range'),'bytes 2-5/10');assert.equal(await r.text(),'2345');
  r=await fetch(url,{headers:{Range:'bytes=-3'}});assert.equal(await r.text(),'789');
  r=await fetch(url,{headers:{Range:'bytes=10-'}});assert.equal(r.status,416);assert.equal(r.headers.get('content-range'),'bytes */10');
  r=await fetch(url,{headers:{Range:'bytes=0-1,3-4'}});assert.equal(r.status,416);
  r=await fetch(url,{method:'HEAD'});assert.equal(r.headers.get('content-type'),'video/mp4');assert.equal(r.headers.get('content-length'),'10');assert.equal(await r.text(),'');
  r=await fetch(url);assert.equal(r.headers.get('transfer-encoding'),'chunked');assert.equal(await r.text(),'0123456789');
 }finally{await new Promise(r=>server.close(r));await rm(dir,{recursive:true});}
});
