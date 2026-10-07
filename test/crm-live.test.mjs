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
 await assert.rejects(flow('session','alice',config,{tab:'sales',cards:[{...cards[0],lastMessageId:'changed'}]}),/could not verify/);
});
test('Live automatically validates saved visible cards in every tab after an old Fetch token expires; no Gmail/model sync',async()=>{
 const config={sessionSecret:'x'.repeat(40)},reads=[];
 const flow=createCrmLive({...security,key:()=>'',firestore:async path=>{reads.push(path);if(path.startsWith('alice/')&&path.includes('/gmail_leads/'))return {lead:JSON.stringify({...cards[0],threadId:cards[0].id.slice(6),kind:path.split('/').at(-1).split('-')[0]})};return null;},request:async()=>{throw Error('No provider call during sync');}});
 for(const tab of ['sales','jobs','actions','finance','clusters']){const result=await flow('context','alice',config,{tab,cards:[cards[0]],fetchId:'expired-token'});assert.equal((await flow('validate','alice',config,{...cards[0],tab,view:result.view})).allowed,true);}
 assert.ok(reads.every(path=>path.startsWith('alice/')));await assert.rejects(flow('context','bob',config,{tab:'sales',cards:[cards[0]]}),/could not verify/);
 const shared=createCrmLive({...security,key:()=>'',firestore:async path=>path.endsWith('/shared')?{metadata:JSON.stringify({uid:'alice',versions:{[cards[0].id.slice(6)]:cards[0].lastMessageId}})}:null});assert.ok((await shared('context','alice',config,{tab:'finance',cards:[cards[0]]})).view);
});
test('spoken intent is recognised anywhere in the sentence and acts on the selected card without asking which one',()=>{
 const [glg,alpha]=cards,act=(phrase,selected=glg.id)=>{const r=resolveCommand(phrase,cards,selected);return r.error?`error:${r.ask?'jev':r.error}`:`${r.action}:${r.id}`;};
 for(const phrase of ['okay mark it as done','now mark this as done','mark done please','mark this as complete','complete it','I\'ve handled this','done.'])assert.equal(act(phrase),`done:${glg.id}`,phrase);
 for(const phrase of ['this is not important','Okay, not important.','get rid of this','not relevant'])assert.equal(act(phrase),`notImportant:${glg.id}`,phrase);
 for(const phrase of ['reply now','draft a reply to it','write a reply','and reply to it','yes reply','send a reply'])assert.equal(act(phrase),`reply:${glg.id}`,phrase);
 assert.equal(act('go to the GLG project',alpha.id),`select:${glg.id}`);assert.equal(act('mark Alpha Insights as not important'),`notImportant:${alpha.id}`);assert.equal(act('next one'),`select:${alpha.id}`);
 const reply=resolveCommand('Reply to Alpha, saying we are not interested!',cards,glg.id);assert.equal(reply.action,'reply');assert.equal(reply.id,alpha.id,'guidance words are content, not a dismissal or target');assert.equal(reply.replyIntent,'we are not interested');
 for(const phrase of ["don't mark it done",'not done yet','is this done?','send it','cancel that'])assert.match(act(phrase),/^error:(?!jev)/,phrase);
 assert.equal(act('Okay. Market is done.'),`done:${glg.id}`,'misheard words that resemble no card do not trigger Which one');assert.equal(act('mark Alpha as done'),`done:${alpha.id}`);assert.equal(act('mark the advisor one done'),'error:jev','an unknown name still goes to JEV');
 assert.equal(act('go to the next project'),`select:${alpha.id}`);assert.equal(resolveCommand('Tell them we are interested and ask for their availability next week.',cards,glg.id).classify,true,'next week is reply guidance, not navigation');
 const vague=resolveCommand('this can wait',cards,glg.id);assert.equal(vague.ask,true);assert.equal(vague.classify,true,'no command word: JEV classifies intent');
 assert.match(act('mark it done',null),/Select a visible card first/);
});
test('JEV identification knows the selected card and only returns a confident intent',async()=>{
 const config={sessionSecret:'x'.repeat(40)};let sent;
 const answers={target:{choice:'selected',confidence:.92},intent:{choice:'notImportant',confidence:.88}};
 const flow=createCrmLive({...security,key:()=>'',firestore:async()=>({metadata:JSON.stringify({versions:Object.fromEntries(cards.map(c=>[c.id.slice(6),c.lastMessageId]))})}),request:async(url,options)=>{sent=JSON.parse(options.body);return new Response(JSON.stringify({answers}));}});
 const previous=process.env.TYPESAFE_API_KEY;process.env.TYPESAFE_API_KEY='fixture';
 try{
  const {view}=await flow('context','alice',config,{tab:'sales',cards});
  let result=await flow('identify','alice',config,{view,tab:'sales',utterance:'this can wait',selectedId:cards[1].id,classify:true});
  assert.equal(result.id,cards[1].id);assert.equal(result.action,'notImportant');assert.match(sent.questions.target.criteria.selected,/Alpha Insights/);assert.ok(!('send' in sent.questions.intent.criteria));
  answers.intent.confidence=.4;result=await flow('identify','alice',config,{view,tab:'sales',utterance:'this can wait',selectedId:cards[1].id,classify:true});assert.equal(result.action,null,'uncertain intent never mutates');
  result=await flow('identify','alice',config,{view,tab:'sales',utterance:'the advisor one'});assert.equal(sent.questions.intent,undefined,'intent is only classified when asked');assert.equal(sent.questions.target.criteria.selected,undefined);assert.equal(result.id,null,'selected is not a valid answer without a selection');
 }finally{if(previous===undefined)delete process.env.TYPESAFE_API_KEY;else process.env.TYPESAFE_API_KEY=previous;}
});
test('Live leaves out a card it cannot verify instead of failing the whole board',async()=>{
 const config={sessionSecret:'x'.repeat(40)},stale={...cards[1],lastMessageId:'changed'};
 const flow=createCrmLive({...security,key:()=>'',firestore:async path=>path.includes('/gmail_leads/')&&path.endsWith(cards[0].id)?{lead:JSON.stringify({threadId:cards[0].id.slice(6),lastMessageId:cards[0].lastMessageId,kind:'sales'})}:null});
 const result=await flow('context','alice',config,{tab:'sales',cards:[cards[0],stale]});assert.deepEqual(result.excluded,[stale.id]);
 assert.equal((await flow('validate','alice',config,{tab:'sales',view:result.view,...cards[0]})).allowed,true);
 await assert.rejects(flow('validate','alice',config,{tab:'sales',view:result.view,...stale}),/changed/,'an excluded card can never be acted on');
 await assert.rejects(flow('context','alice',config,{tab:'sales',cards:[stale]}),/could not verify/);
});
