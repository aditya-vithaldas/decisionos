import test from 'node:test';
import assert from 'node:assert/strict';
import {commerceSession} from '../scripts/commerce-api.mjs';
async function call(origin, text) {
  const req = {method:'POST',headers:{origin,host:'localhost:4176'},async *[Symbol.asyncIterator](){yield Buffer.from(text);}};
  const result={}; const res={writeHead(status,headers){Object.assign(result,{status,headers});return this;},end(body){result.body=body;}};
  await commerceSession(req,res); return result;
}
test('same-site voice gateway rejects foreign origins and malformed connection payloads',async()=>{
  assert.equal((await call('https://other.test','v=0\r\n')).status,403);
  assert.equal((await call('https://decisionaxis.co','invalid')).status,400);
  assert.equal((await call('https://decisionaxis.co','v=0'+'x'.repeat(50000))).status,413);
});
test('voice gateway calls only the existing Loop backend and never forwards browser cookies',async()=>{
  const original=globalThis.fetch;let request;
  globalThis.fetch=async(url,options)=>{request={url,options};return new Response('{"connected":true}',{status:200});};
  try{
    const result=await call('https://decisionaxis.co','v=0\r\n');
    assert.equal(result.status,200);assert.equal(request.url,'https://ecommerce-storefront.decisionos.me/api/realtime');
    assert.equal(request.options.headers.Origin,'https://ecommerce-storefront.decisionos.me');
    assert.equal(request.options.headers.Cookie,undefined);assert.equal(result.headers['Cache-Control'],'no-store');
  }finally{globalThis.fetch=original;}
});
