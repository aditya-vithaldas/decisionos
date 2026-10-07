import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceQuery, workspaceThread, validateWorkspace, checkedThemes, classifyTheme, checkedFinance, classifyThemeBatch } from '../scripts/crm-workspace.mjs';
const now = Date.UTC(2026, 9, 6, 12);
const thread = (days, text, labels = ['CATEGORY_UPDATES']) => ({ id: '12345678abcdefab', messages: [{ id: 'last', internalDate: String(now-days*86400000), labelIds: labels, payload: { mimeType:'text/plain', headers:[{name:'Subject',value:'Application at Example'},{name:'From',value:'Hiring <hiring@example.test>'},{name:'To',value:'owner@example.test'}], body:{data:Buffer.from(text).toString('base64url')} } }] });
test('sent mail without a recipient header cannot crash a scan',()=>{const value=thread(1,'A sent note',['SENT']);value.messages[0].payload.headers=value.messages[0].payload.headers.filter(h=>h.name!=='To');assert.doesNotThrow(()=>workspaceThread(value,'owner@example.test',now));});
test('finance distinguishes due, paid and total amounts with literal currency evidence',()=>{
  const candidate=workspaceThread(thread(1,'Invoice total €100.00. Balance due €20.00 payable 2026-10-10. Receipt: paid $15.00.'),'owner@example.test',now);
  const due={type:'Amount due',amount:'20.00',currency:'€',amountKind:'balance_due',amountQuote:'Balance due €20.00 payable 2026-10-10.',requiresAction:true};
  assert.equal(checkedFinance(due,candidate).amount,'20.00');assert.equal(checkedFinance(due,candidate).requiresAction,true);
  assert.equal(checkedFinance({...due,amount:'100.00',amountQuote:'Invoice total €100.00. Balance due €20.00'},candidate).amount,null);
  assert.equal(checkedFinance({...due,currency:'USD'},candidate).currency,null);
  const paid=checkedFinance({type:'Receipt',amount:'15.00',currency:'$',amountKind:'paid_amount',amountQuote:'Receipt: paid $15.00.',requiresAction:false},candidate);
  assert.equal(paid.amount,'15.00');assert.equal(paid.requiresAction,false);
  assert.equal(checkedFinance({...due,type:'Payment made'},candidate),null);
});
test('batched Jev questions are bound to each input and retain actual probabilities',async()=>{
  const candidates=[workspaceThread(thread(1,'Your job interview invitation'),'owner@example.test',now),workspaceThread(thread(1,'Your shopping receipt'),'owner@example.test',now)];
  const results=await classifyThemeBatch(candidates,['Jobs','Shopping','Other'],{key:'fixture',request:async(url,options)=>{
    const body=JSON.parse(options.body);assert.equal(Object.keys(body.questions).length,2);assert.match(body.questions.mail_0.instructions,/ONLY mail_0/);assert.doesNotMatch(body.state,/owner@example/);
    return new Response(JSON.stringify({answers:{mail_0:{choice:'theme_0',confidence:.9,probabilities:{theme_0:.96,theme_1:.02,theme_2:.02}},mail_1:{choice:'theme_1',confidence:.4,probabilities:{theme_0:.2,theme_1:.6,theme_2:.2}}}}));
  }});assert.equal(results[0].decision.probability,.96);assert.equal(results[0].decision.confidence,.9);assert.equal(results[1].theme,'Needs review');
});
test('workspace searches all categories and archived mail in fixed windows; jobs query adds bounded older history', () => {
  const q = workspaceQuery('sales', now); assert.match(q, /-in:spam -in:trash/); assert.doesNotMatch(q,/in:inbox|-category|-from/);
  assert.match(q, new RegExp(`after:${(now-7*86400000)/1000}`));
  assert.match(workspaceQuery('clusters', now), new RegExp(`after:${(now-14*86400000)/1000}`));
  assert.match(workspaceQuery('jobs', now), new RegExp(`after:${(now-180*86400000)/1000}`));
});
test('job inactivity uses complete thread date and strict closure evidence; automated application updates remain eligible', () => {
  const old = workspaceThread(thread(9, 'Thank you for your application.'), 'owner@example.test', now);
  assert.equal(validateWorkspace({items:[{threadId:old.threadId,kind:'jobs',quote:'Thank you for your application.',closed:false}]},[old],'jobs',now)[0].stage,'Inactive');
  const recent = workspaceThread(thread(2, 'Unfortunately the interviewer is away.'), 'owner@example.test', now);
  assert.equal(validateWorkspace({items:[{threadId:recent.threadId,kind:'jobs',quote:'Unfortunately the interviewer is away.',closed:true}]},[recent],'jobs',now)[0].stage,'Open');
  const closed = workspaceThread(thread(2, 'We are not moving forward with your application.'), 'owner@example.test', now);
  assert.equal(validateWorkspace({items:[{threadId:closed.threadId,kind:'jobs',quote:'We are not moving forward with your application.',closed:true}]},[closed],'jobs',now)[0].stage,'Closed');
  assert.deepEqual(validateWorkspace({items:[{threadId:old.threadId,kind:'jobs',quote:'Invented evidence'}]},[old],'jobs',now),[]);
  assert.equal(workspaceThread(thread(2,'Excluded',['SPAM']), 'owner@example.test',now),null);
});
test('themes use bounded unique labels; Jev sends minimized snippets and routes uncertain results to review',async()=>{
  const themes=checkedThemes({themes:['Jobs','Bills','Shopping','Other']}); assert.equal(themes.length,4);
  assert.deepEqual(checkedThemes({themes:['Jobs']}),[]);
  const candidate=workspaceThread(thread(2,'Thank you for your application. '.repeat(100)), 'owner@example.test',now);
  let input;
  const result=await classifyTheme(candidate,themes,{key:'fixture',request:async(url,opts)=>{assert.equal(url,'https://api.typesafe.ai/v1/systemone');input=JSON.parse(opts.body);return new Response(JSON.stringify({answers:{theme:{choice:'theme_0',confidence:.5}}}));}});
  assert.equal(result.theme,'Needs review'); assert.equal(result.suggestedTheme,'Jobs'); assert.ok(input.state.length<700); assert.doesNotMatch(input.state,/owner@example/);
  assert.equal((await classifyTheme(candidate,themes,{key:''})).theme,'Unclassified');
});
