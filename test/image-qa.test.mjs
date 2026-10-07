import test from 'node:test';import assert from 'node:assert/strict';
import {createImageQAHandler} from '../scripts/image-qa-api.mjs';
import {imageProducts,visualAttributes} from '../scripts/image-qa-catalog.mjs';
async function invoke(handler,body,path='/api/image-qa/check'){const result={};await handler({url:path,method:path.endsWith('catalog')?'GET':'POST',headers:{origin:'https://decisionaxis.co'},async *[Symbol.asyncIterator](){yield JSON.stringify(body);}}, {writeHead(code){result.code=code;return this;},end(body){result.body=JSON.parse(body);}});return result;}
test('ten real sources; deliberate mismatches alter claims, never provider probabilities',async()=>{
 assert.equal(imageProducts.length,10);assert.equal(new Set(imageProducts.map(p=>p.source)).size,10);assert.notEqual(visualAttributes(imageProducts[0],true).color,imageProducts[0].attributes.color);
 let calls=0;const handler=createImageQAHandler({key:()=> 'fixture',request:async(url,options)=>{calls++;if(url.startsWith('https://img01.ztat.net/'))return new Response('jpeg fixture',{headers:{'content-type':'image/jpeg'}});assert.equal(url,'https://api.openai.com/v1/decisions');const input=JSON.parse(options.body);assert.equal(input.model,'gpt-6-luna');assert.match(input.input[0].content[1].image_url,/^data:image\/jpeg;base64,/);assert.equal(input.questions[0].type,'predicate');return new Response(JSON.stringify({model:'gpt-6-luna',answers:[{name:'color',type:'predicate',probability:.137},{name:'pattern',type:'refusal'},{name:'style',type:'predicate',probability:.97},{name:'texture',type:'predicate',probability:.83}]}));}});
 const result=await invoke(handler,{id:'gillea',test:true});assert.equal(result.code,200);assert.equal(result.body.answers[0].probability,.137);assert.equal(result.body.answers[1].probability,null);assert.equal(result.body.answers[1].status,'refused');
 const warm=await invoke(handler,{id:'gillea',test:true});assert.equal(warm.body.cached,true);assert.equal(calls,2);
 assert.equal((await invoke(handler,{id:'https://private-server'})).code,400);
});
test('no credential means unavailable, never fixture scores',async()=>{const handler=createImageQAHandler({key:()=>''});const result=await invoke(handler,{id:'gillea'});assert.equal(result.code,503);assert.match(result.body.error,/OPENAI_API_KEY/);assert.equal(result.body.answers,undefined);});
