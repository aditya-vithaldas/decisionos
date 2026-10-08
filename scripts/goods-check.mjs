import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {goods,decisionsResult,createGoodsHandler} from './goods-api.mjs';
assert.equal(goods.length,12);
const results=decisionsResult({answers:[{name:'coat',type:'predicate',probability:.99},{name:'tee',type:'predicate',probability:.2},{name:'hat',type:'predicate',probability:.5},{name:'drill',type:'refusal'},{name:'desk',type:'predicate',probability:1.1}]});
assert.equal(results.find(p=>p.id==='coat').yes,true);assert.equal(results.find(p=>p.id==='tee').yes,false);assert.equal(results.find(p=>p.id==='hat').yes,true);assert.equal(results.find(p=>p.id==='drill').yes,null);assert.equal(results.find(p=>p.id==='desk').yes,null);
let providerBody;const handler=createGoodsHandler({key:()=> 'test-only',loadImage:async()=>Buffer.from('test image'),request:async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/decisions');providerBody=JSON.parse(options.body);return {ok:true,json:async()=>({model:'test-model',answers:goods.map(p=>({name:p.id,type:'predicate',probability:p.id==='coat'?.9:.1}))})};}});
async function call(body){const req=Readable.from([JSON.stringify(body)]);req.url='/api/goods/decide';req.method='POST';req.headers={};req.socket={remoteAddress:'test'};let status,data;const res={writeHead(s){status=s;return this},end(s){data=JSON.parse(s)}};await handler(req,res);return {status,data};}
const r=await call({question:'Is this related to winter?'});assert.equal(r.status,200);assert.equal(r.data.goods.filter(p=>p.yes).length,1);assert.equal(providerBody.questions.length,12);assert.equal(providerBody.input[0].content[1].type,'input_image');assert.match(providerBody.questions[9].instructions,/row 3, column 2/);assert.match(providerBody.questions[0].instructions,/winter/);assert.equal((await call({question:''})).status,400);
console.log('Goods checks passed: image predicates, cell targeting, threshold, unknown answers, validation.');
