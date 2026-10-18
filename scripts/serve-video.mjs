import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
// Stream media rather than buffering a large response; ranges support seeking.
export async function serveVideo(req,res,path){
 const {size}=await stat(path);
 const headers={'Content-Type':'video/mp4','Accept-Ranges':'bytes','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'};
 let start=0,end=size-1,status=200;
 if(req.headers.range){
  const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  const invalid=()=>{res.writeHead(416,{...headers,'Content-Range':`bytes */${size}`});res.end();};
  if(!m||(!m[1]&&!m[2]))return invalid();
  if(!m[1]){const suffix=Number(m[2]);if(!Number.isSafeInteger(suffix)||suffix<=0)return invalid();start=Math.max(0,size-suffix);}
  else {start=Number(m[1]);end=m[2]?Number(m[2]):Math.min(size-1,start+8*1024*1024-1);}
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||end<start)return invalid();
  end=Math.min(end,size-1);status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;headers['Content-Length']=end-start+1;
 }
 if(req.method==='HEAD'){if(status===200)headers['Content-Length']=size;res.writeHead(status,headers);res.end();return;}
 res.writeHead(status,headers);
 const stream=createReadStream(path,{start,end});
 stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
}
