import test from 'node:test';
import assert from 'node:assert/strict';
import { createFeedbackHandler, checkedTarget, evidenceReport } from '../scripts/feedback-api.mjs';
test('target and evidence validation do not invent emotions or bypass frame protections', () => {
  assert.equal(checkedTarget('https://example.com/shop'), 'https://example.com/shop');
  for (const target of ['http://example.com', 'https://user:pass@example.com', 'https://127.0.0.1', 'https://169.254.169.254']) assert.throws(()=>checkedTarget(target));
  const report=evidenceReport([{type:'comment',at:12,text:'I like the search.',category:'liked'},{type:'face_cues',at:15,cues:{jawOpen:.7}},{type:'transcript',at:18,text:"I can't find the size guide."}]);
  assert.equal(report.length,2);assert.equal(report[0].category,'liked');assert.equal(report[1].category,'friction');assert.equal(report[1].at,18);assert.match(report[1].source,/check against recording/);
});
test('study-to-participant-to-report flow enforces consent, owner isolation, scoped media and real transcription calls',async()=>{
  const original=globalThis.fetch, docs=new Map();let speechCalls=0, objects=0; const root='https://firestore.googleapis.com/v1/projects/striking-loop-447915-q3/databases/(default)/documents/feedback_studies';
  const response=(value,status=200)=>new Response(JSON.stringify(value),{status});
  const doc=(path,data)=>({name:`${root}/${path}`,fields:{data:{stringValue:JSON.stringify(data)}},updateTime:'2026-10-06T00:00:00Z'});
  globalThis.fetch=async(url,options={})=>{
    if(String(url).startsWith(root)){
      const path=String(url).slice(root.length+1).split('?')[0];
      if(!path||path.endsWith('/feedback_sessions'))return response({documents:[...docs].filter(([key])=>path?key.startsWith(`${path}/`):!key.includes('/')).map(([key,data])=>doc(key,data))});
      if(options.method==='PATCH')docs.set(path,JSON.parse(JSON.parse(options.body).fields.data.stringValue));
      return docs.has(path)?response(doc(path,docs.get(path))):response({},404);
    }
    if(String(url).includes('storage.googleapis.com/upload')){objects++;assert.equal(options.headers.Authorization,'Bearer cloud');return response({name:'private-fixture'});}
    if(String(url).includes('speech.googleapis.com')){speechCalls++;const input=JSON.parse(options.body);assert.equal(input.config.encoding,'WEBM_OPUS');assert.ok(input.audio.content);return response({results:[{alternatives:[{transcript:'I like the product search.',confidence:.9,words:[{startTime:'1.2s'}]}]}]});}
    throw new Error('Unexpected outbound request (target sites must never be fetched by the server).');
  };
  const handler=createFeedbackHandler(async()=>'cloud'), config={origin:'https://example.test'};
  async function invoke(path,{uid='owner',method='GET',body,token='',origin=config.origin,raw=false}={}){
    const req={url:`/crm/api/feedback${path}`,method,headers:{origin,authorization:token?`Bearer ${token}`:''},async *[Symbol.asyncIterator](){if(body!==undefined)yield raw?body:JSON.stringify(body);}};
    const result={};const res={headersSent:false,writeHead(status,headers){Object.assign(result,{status,headers});this.headersSent=true;return this;},end(value){result.body=value;}};await handler(req,res,path.split('?')[0],config,uid);return result;
  }
  try{
    assert.equal((await invoke('/create',{uid:null,method:'POST',body:{}})).status,401);
    const created=JSON.parse((await invoke('/create',{method:'POST',body:{title:'Fixture study',target:'https://example.com',task:'Try search.'}})).body), invite=new URL(created.participantUrl).searchParams.get('invite');
    assert.equal((await invoke(`/report?study=${created.id}`,{uid:null})).status,401);assert.equal((await invoke(`/report?study=${created.id}`,{uid:'other'})).status,403);
    const consent={study:created.id,invite,consent:true,microphone:true,screen:false,camera:false,faceCues:false};
    assert.equal((await invoke('/join',{uid:null,method:'POST',body:{...consent,consent:false}})).status,400);
    const joined=JSON.parse((await invoke('/join',{uid:null,method:'POST',body:consent})).body), event={study:created.id,sessionId:joined.sessionId,type:'comment',at:3,text:'The menu was hard to find.',category:'friction'};
    assert.equal((await invoke('/event',{uid:null,method:'POST',body:event,token:'wrong'})).status,403);
    assert.equal((await invoke('/event',{uid:null,method:'POST',body:event,token:joined.token,origin:'https://other.test'})).status,403);
    assert.equal((await invoke('/event',{uid:null,method:'POST',body:event,token:joined.token})).status,200);
    assert.equal((await invoke('/event',{uid:null,method:'POST',token:joined.token,body:{...event,type:'face_cues',cues:{jawOpen:.8}}})).status,400);
    const audio=await invoke(`/chunk?study=${created.id}&session=${joined.sessionId}&kind=audio&at=4`,{uid:null,method:'POST',token:joined.token,body:Buffer.from('webm-fixture'),raw:true});
    assert.equal(audio.status,200);assert.equal(speechCalls,1);assert.equal(objects,1);assert.equal(JSON.parse(audio.body).entries[0].at,5.2);
    assert.equal((await invoke(`/chunk?study=${created.id}&session=${joined.sessionId}&kind=screen&at=8`,{uid:null,method:'POST',token:joined.token,body:Buffer.from('fixture'),raw:true})).status,403);
    assert.equal((await invoke('/finish',{uid:null,method:'POST',token:joined.token,body:{study:created.id,sessionId:joined.sessionId}})).status,200);
    assert.equal((await invoke('/event',{uid:null,method:'POST',body:event,token:joined.token})).status,409);
    const report=JSON.parse((await invoke(`/report?study=${created.id}`)).body);assert.equal(report.sessions.length,1);assert.equal(report.sessions[0].report.length,2);assert.equal(report.sessions[0].status,'finished');assert.ok(!('tokenHash' in report.sessions[0]));
  }finally{globalThis.fetch=original;}
});
