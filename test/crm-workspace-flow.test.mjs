import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspaceFlow } from '../scripts/crm-workspace-flow.mjs';
import { crmSecurityForTests as security } from '../scripts/crm-api.mjs';

test('Fetch is model-free and encrypted; Analyze consumes stored mail, grounds cards, isolates owners and reuses actual decisions', async()=>{
  const originalFetch=globalThis.fetch, oldGemini=process.env.GEMINI_API_KEY, oldJev=process.env.TYPESAFE_API_KEY;
  process.env.GEMINI_API_KEY='fixture';process.env.TYPESAFE_API_KEY='fixture';
  const docs=new Map(), googleCalls=[], config={key:Buffer.alloc(32,9),sessionSecret:'s'.repeat(40)};
  let modelCalls=0,jevCalls=0;
  const makeThread=(id,text)=>({id,messages:[{id:`last-${id}`,internalDate:String(Date.now()-1000),labelIds:['CATEGORY_PROMOTIONS'],payload:{mimeType:'text/plain',headers:[{name:'Subject',value:'Private sample'},{name:'From',value:'customer@example.test'}],body:{data:Buffer.from(text).toString('base64url')}}}]});
  const ids=['12345678abcdefaa','12345678abcdefbb'];
  const dependencies={...security,
    googleRequest:async(uid,user,config,url,options)=>{googleCalls.push({uid,url,options});if(url.includes('/threads?'))return{threads:ids.map(id=>({id}))};return makeThread(url.split('/threads/')[1].split('?')[0],url.includes(ids[0])?'Please send a proposal.':'Our weekly shopping promotion.');},
    firestore:async(path,method='GET',fields)=>{if(method==='PATCH')docs.set(path,fields);return docs.get(path)||null;},
    storedList:async(uid,collection)=>[...docs].filter(([path])=>path.startsWith(`${uid}/${collection}/`)).map(([path,value])=>({id:path.split('/').at(-1),...value})),
  };
  const flow=createWorkspaceFlow(dependencies);
  globalThis.fetch=async(url,options)=>{
    if(String(url).includes('typesafe.ai')){jevCalls++;return new Response(JSON.stringify({answers:{mail_0:{choice:'theme_0',confidence:.98,probabilities:{theme_0:.99,theme_1:.01}},mail_1:{choice:'theme_1',confidence:.97,probabilities:{theme_0:.03,theme_1:.97}}}}));}
    modelCalls++;return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({items:[{threadId:ids[0],kind:'sales',quote:'Please send a proposal.',title:'Proposal request'}]})}]}}]}));
  };
  try{
    const fetched=await flow.run('fetch','alice',{email:'owner@example.test'},config,{tab:'sales'});
    assert.equal(modelCalls,0);assert.equal(jevCalls,0);assert.equal(fetched.items.length,2);assert.ok(fetched.items.every(x=>x.stage==='Unsorted'));assert.equal(fetched.fetchComplete,true);
    const batch=[...docs.values()].find(x=>x.payload);assert.ok(batch);assert.ok(!batch.payload.includes('Please send a proposal'));assert.equal(security.decrypt(batch.payload,config.key).length,2);
    await assert.rejects(flow.run('analyze','bob',{email:'other@example.test'},config,{tab:'sales',fetchId:fetched.fetchId}),/own workspace/);
    const callsBefore=googleCalls.length;
    const analyzed=await flow.run('analyze','alice',{email:'owner@example.test'},config,{tab:'sales',fetchId:fetched.fetchId});
    assert.equal(googleCalls.length,callsBefore,'Analyze must not refetch Gmail');assert.equal(jevCalls,1);assert.equal(modelCalls,0,'Analyze must invoke JEV exclusively');assert.equal(analyzed.timings.geminiRequests,0);assert.equal(analyzed.timings.jevThreads,2);
    assert.equal(analyzed.items.find(x=>x.id.endsWith(ids[0])).quote,'Please send a proposal.');
    assert.equal(analyzed.items.find(x=>x.id.endsWith(ids[1])).stage,'Other');assert.equal(analyzed.items.find(x=>x.id.endsWith(ids[0])).decision.probability,.99);
    assert.equal(analyzed.items[0].decision.batchSize,2);
    assert.ok(Number.isFinite(analyzed.items[0].decision.apiMs));
    const financeFetchId=fetched.fetchIds.finance;
    const beforeFinance=globalThis.fetch;
    globalThis.fetch=async(url,options)=>{
      const payload=JSON.parse(options.body);
      assert.deepEqual(Object.values(payload.questions.mail_0.criteria),['Amount','Payment failures','General information','Other']);
      return new Response(JSON.stringify({answers:{mail_0:{choice:'theme_0',confidence:.98,probabilities:{theme_0:.8,theme_1:.1,theme_2:.05,theme_3:.05}},mail_1:{choice:'theme_2',confidence:.97,probabilities:{theme_0:.1,theme_1:.05,theme_2:.8,theme_3:.05}}}}));
    };
    const finance=await flow.run('analyze','alice',{email:'owner@example.test'},config,{tab:'finance',fetchId:financeFetchId});
    assert.deepEqual(finance.items.map(x=>x.stage).sort(),['Amount','General information']);
    assert.equal(finance.items.find(x=>x.stage==='Amount').decision.probabilities['Payment failures'],.1);
    globalThis.fetch=beforeFinance;
    const warm=await flow.run('analyze','alice',{email:'owner@example.test'},config,{tab:'sales',fetchId:fetched.fetchId});assert.equal(warm.cached,true);assert.equal(modelCalls,0);assert.equal(jevCalls,1);
    const restarted=createWorkspaceFlow(dependencies);
    const durableWarm=await restarted.run('analyze','alice',{email:'owner@example.test'},config,{tab:'sales',fetchId:fetched.fetchId});assert.equal(durableWarm.cached,true);assert.equal(durableWarm.items.length,2);assert.equal(modelCalls,0);
    const incremental=await restarted.run('fetch','alice',{email:'owner@example.test'},config,{tab:'sales'});
    assert.equal(incremental.incremental,true);assert.equal(incremental.newlyFetched,0);assert.equal(incremental.items.length,2);assert.equal(jevCalls,1);
    const firstQuery=new URL(googleCalls.find(c=>c.url.includes('/threads?')).url).searchParams.get('q');
    const lastQuery=new URL(googleCalls.filter(c=>c.url.includes('/threads?')).at(-1).url).searchParams.get('q');
    assert.ok(Number(lastQuery.match(/after:(\d+)/)[1])>Number(firstQuery.match(/after:(\d+)/)[1]),'repeat fetch uses a bounded timestamp overlap, not the whole window');
    docs.set(`alice/workspace_dismissals/sales-${ids[0]}`,{tab:'sales',threadId:ids[0],status:'dismissed'});
    const dismissed=await flow.run('analyze','alice',{email:'owner@example.test'},config,{tab:'sales',fetchId:fetched.fetchId});assert.equal(dismissed.items.length,1);assert.equal(dismissed.items[0].stage,'Other');
    for(const id of ids)docs.set(`alice/mail_dispositions/${id}-last-${id}`,{threadId:id,lastMessageId:`last-${id}`,status:'done'});
    const disposedWarm=await flow.run('analyze','alice',{email:'owner@example.test'},config,{tab:'sales',fetchId:fetched.fetchId});assert.equal(disposedWarm.items.length,0);
    for(const tab of ['sales','jobs','actions','finance','clusters']) {
      const fresh=createWorkspaceFlow(dependencies);
      assert.equal((await fresh.run('fetch','alice',{email:'owner@example.test'},config,{tab})).items.length,0,'dispositions survive handler restart and every category');
    }
    assert.equal((await flow.run('fetch','bob',{email:'owner@example.test'},config,{tab:'finance'})).items.length,2,'dispositions are account isolated');
    assert.ok(googleCalls.every(c=>!c.options?.method||c.options.method==='GET'),'no Gmail mutation is permitted');
  }finally{globalThis.fetch=originalFetch;if(oldGemini===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldGemini;if(oldJev===undefined)delete process.env.TYPESAFE_API_KEY;else process.env.TYPESAFE_API_KEY=oldJev;}
});
