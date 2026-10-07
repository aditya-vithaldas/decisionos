import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {createCrmLive} from '../scripts/crm-live.mjs';import {crmSecurityForTests as security} from '../scripts/crm-api.mjs';
const {resolveCommand}=await import('data:text/javascript;base64,'+Buffer.from(await readFile(new URL('../assets/crm-live-commands.js',import.meta.url))).toString('base64'));
const cards=[{id:'gmail-12345678abcdefaa',lastMessageId:'a',title:'GLG overview consultation',tab:'sales'},{id:'gmail-12345678abcdefbb',lastMessageId:'b',title:'Alpha Insights',tab:'sales'}];
test('voice ordinals/names resolve only current visible cards; ambiguity/send/negation never mutate',()=>{
 assert.equal(resolveCommand('show the second one',cards).id,cards[1].id);assert.equal(resolveCommand('GLG overview consultation',cards).id,cards[0].id);
 assert.equal(resolveCommand('go to Alpha Insights',cards).action,'select');assert.equal(resolveCommand('select it',cards,cards[1].id).id,cards[1].id);assert.ok(resolveCommand('go to it',cards).error);
 assert.ok(resolveCommand('consultation',[...cards,{...cards[0],id:'other'}]).error);assert.ok(resolveCommand('show third one',cards).error);
 assert.ok(resolveCommand('second one',cards.slice(0,1)).error);assert.ok(resolveCommand('send it',cards,cards[0].id).error);assert.ok(resolveCommand("don't mark it done",cards,cards[0].id).error);
 assert.deepEqual(resolveCommand('scroll down a bit',cards),{action:'scroll',direction:'down'});assert.equal(resolveCommand('scroll up',cards).direction,'up');
 const reply=resolveCommand('reply to it with thanks for the invitation',cards,cards[0].id);assert.equal(reply.action,'reply');assert.equal(reply.replyIntent,'thanks for the invitation');assert.equal(resolveCommand('mark it done',cards,cards[0].id).action,'done');
 for(const phrase of ['done','mark this done','mark it done','mark that done']){assert.equal(resolveCommand(phrase,cards,cards[0].id).id,cards[0].id);assert.equal(resolveCommand(phrase,cards,cards[0].id).action,'done');}
 assert.equal(resolveCommand('reply',cards,cards[0].id).id,cards[0].id);assert.equal(resolveCommand('not important',cards,cards[0].id).action,'notImportant');assert.ok(resolveCommand('done',cards).error);
});
test('Live tokens use Gemini3.8 only; current view proof isolates user/tab/card without Gmail or generation',async()=>{
 let requests=0;const config={sessionSecret:'x'.repeat(40)},flow=createCrmLive({...security,key:()=> 'fixture',firestore:async()=>({metadata:JSON.stringify({versions:Object.fromEntries(cards.map(c=>[c.id.slice(6),c.lastMessageId]))})}),request:async(url,options)=>{requests++;assert.match(url,/auth_tokens/);const body=JSON.parse(options.body);assert.equal(body.uses,1);assert.equal(body.bidiGenerateContentSetup.model,'models/gemini-3.8-live');assert.ok(!options.body.includes('full email'));return new Response(JSON.stringify({name:'auth_tokens/fixture'}));}});
 const session=await flow('session','alice',config,{tab:'sales',cards});assert.equal(session.model,'gemini-3.8-live');assert.equal(requests,1);
 assert.equal((await flow('validate','alice',config,{tab:'sales',view:session.view,...cards[0]})).allowed,true);
 await assert.rejects(flow('validate','bob',config,{tab:'sales',view:session.view,...cards[0]}),/changed/);
 await assert.rejects(flow('validate','alice',config,{...cards[0],tab:'jobs',view:session.view}),/changed/);
 await assert.rejects(flow('validate','alice',config,{tab:'sales',view:session.view,id:'unknown'}),/changed/);
 await flow('context','alice',config,{tab:'sales',cards});assert.equal(requests,1,'view refresh does not invoke a model');
 await assert.rejects(flow('session','alice',config,{tab:'sales',cards:[{...cards[0],lastMessageId:'changed'}]}),/could not load/);
});
test('Live automatically validates saved visible cards in every tab after an old Fetch token expires; no Gmail/model sync',async()=>{
 const config={sessionSecret:'x'.repeat(40)},reads=[];
 const flow=createCrmLive({...security,key:()=>'',firestore:async path=>{reads.push(path);if(path.startsWith('alice/')&&path.includes('/gmail_leads/'))return {lead:JSON.stringify({...cards[0],threadId:cards[0].id.slice(6),kind:path.split('/').at(-1).split('-')[0]})};return null;},request:async()=>{throw Error('No provider call during sync');}});
 for(const tab of ['sales','jobs','actions','finance','clusters']){const result=await flow('context','alice',config,{tab,cards:[cards[0]],fetchId:'expired-token'});assert.equal((await flow('validate','alice',config,{...cards[0],tab,view:result.view})).allowed,true);}
 assert.ok(reads.every(path=>path.startsWith('alice/')));await assert.rejects(flow('context','bob',config,{tab:'sales',cards:[cards[0]]}),/could not load/);
 const shared=createCrmLive({...security,key:()=>'',firestore:async path=>path.endsWith('/shared')?{metadata:JSON.stringify({uid:'alice',versions:{[cards[0].id.slice(6)]:cards[0].lastMessageId}})}:null});assert.ok((await shared('context','alice',config,{tab:'finance',cards:[cards[0]]})).view);
});
