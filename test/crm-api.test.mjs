import test from 'node:test';
import assert from 'node:assert/strict';
import { createCrmHandler, crmSecurityForTests as security } from '../scripts/crm-api.mjs';

const secret = 's'.repeat(40), key = Buffer.alloc(32, 7);
Object.assign(process.env, { CRM_GOOGLE_CLIENT_ID: 'test-client', CRM_GOOGLE_CLIENT_SECRET: 'test-secret', CRM_SESSION_SECRET: secret,
  CRM_TOKEN_KEY: key.toString('base64'), CRM_REDIRECT_URI: 'https://example.test/crm/api/oauth/callback' });
const session = uid => `crm_session=${security.seal({ uid, exp: Date.now() + 60000 }, secret)}`;
async function invoke(path, { method = 'GET', cookie = '', origin = 'https://example.test', body, handler = createCrmHandler() } = {}) {
  const req = { url: `/crm/api${path}`, method, headers: { cookie, origin, 'content-type': 'application/json' },
    async *[Symbol.asyncIterator]() { if (body !== undefined) yield JSON.stringify(body); } };
  const output = {};
  const res = { writeHead(status, headers) { Object.assign(output, { status, headers }); return this; }, end(body) { output.body = body; } };
  await handler(req, res); return output;
}
test('workspace batch scans paginate without Inbox/category exclusions and bind cursors to owner and tab', async () => {
  const original = globalThis.fetch, originalKey = process.env.GEMINI_API_KEY; process.env.GEMINI_API_KEY = 'fixture';
  const queries = [], response = data => new Response(JSON.stringify(data));
  const handler = createCrmHandler(); let modelCalls = 0, historyId = 'history-one';
  const user = { email:'owner@example.test', gmailOptIn:'true', scopes:'https://www.googleapis.com/auth/gmail.readonly', tokenCipher:security.encrypt({accessToken:'fixture',expiresAt:Date.now()+3600000},key) };
  globalThis.fetch = async (url, options={}) => {
    url = String(url);
    if(url.includes('metadata.google.internal'))return response({access_token:'cloud',expires_in:3600});
    if(url.includes('firestore.googleapis.com'))return response({fields:Object.fromEntries(Object.entries(user).map(([k,v])=>[k,{stringValue:v}]))});
    if(url.endsWith('/profile'))return response({historyId});
    if(url.includes('/threads?')){const parsed=new URL(url);queries.push(parsed.searchParams.get('q'));return response({threads:[{id:'12345678abcdefab'}],...(parsed.searchParams.has('pageToken')?{}:{nextPageToken:'page-two'})});}
    if(url.includes('/threads/'))return response({id:'12345678abcdefab',messages:[{id:'last',internalDate:String(Date.now()-1000),labelIds:['CATEGORY_PROMOTIONS'],payload:{mimeType:'text/plain',headers:[{name:'From',value:'buyer@example.test'}],body:{data:Buffer.from('Please send a proposal.').toString('base64url')}}}]});
    if(url.includes('generativelanguage.googleapis.com')){modelCalls++;assert.match(url,/gemini-3.8-flash/);return response({candidates:[{content:{parts:[{text:JSON.stringify({items:[{threadId:'12345678abcdefab',kind:'sales',quote:'Please send a proposal.'}]})}]}}]});}
    throw Error('Unexpected request');
  };
  try {
    assert.equal((await invoke('/workspace/scan',{method:'POST',body:{tab:'sales'}})).status,401);
    const first=await invoke('/workspace/scan',{handler,method:'POST',cookie:session('alice'),body:{tab:'sales'}});assert.equal(first.status,200);
    const data=JSON.parse(first.body);assert.equal(data.items.length,1);assert.ok(data.nextCursor);
    assert.equal((await invoke('/workspace/scan',{method:'POST',cookie:session('bob'),body:{tab:'sales',cursor:data.nextCursor}})).status,400);
    assert.equal((await invoke('/workspace/scan',{method:'POST',cookie:session('alice'),body:{tab:'jobs',cursor:data.nextCursor}})).status,400);
    const last=await invoke('/workspace/scan',{handler,method:'POST',cookie:session('alice'),body:{tab:'sales',cursor:data.nextCursor}});assert.equal(JSON.parse(last.body).nextCursor,null);
    assert.ok(queries.every(q=>!q.includes('in:inbox')&&!q.includes('-category')));assert.equal(queries[0],queries[1]);
    const calls = modelCalls, listed = queries.length;
    const warm = JSON.parse((await invoke('/workspace/scan',{handler,method:'POST',cookie:session('alice'),body:{tab:'sales'}})).body);
    assert.equal(warm.cached, true); assert.equal(warm.scanned, 2); assert.equal(warm.items.length,1);
    assert.equal(modelCalls,calls); assert.equal(queries.length,listed);
    historyId = 'history-two';
    const changed = JSON.parse((await invoke('/workspace/scan',{handler,method:'POST',cookie:session('alice'),body:{tab:'sales'}})).body);
    assert.equal(changed.cached, undefined); assert.equal(changed.timings.cacheHits,1); assert.equal(queries.length,listed+1);
    await invoke('/workspace/scan',{handler,method:'POST',cookie:session('bob'),body:{tab:'sales'}});
    assert.equal(modelCalls,calls+1,'another owner cannot reuse either cache');
  } finally {globalThis.fetch=original;if(originalKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=originalKey;}
});
test('sessions reject tampering and expiration; token encryption is authenticated', () => {
  const valid = security.seal({ uid: 'alice', exp: Date.now() + 10000 }, secret);
  assert.equal(security.unseal(valid, secret).uid, 'alice');
  assert.equal(security.unseal(`${valid}x`, secret), null);
  assert.equal(security.unseal(security.seal({ exp: 1 }, secret), secret), null);
  const encrypted = security.encrypt({ refreshToken: 'private' }, key);
  assert.equal(security.decrypt(encrypted, key).refreshToken, 'private');
  assert.throws(() => security.decrypt(encrypted, Buffer.alloc(32, 9)));
});
test('OAuth uses state and PKCE; wrong state cannot exchange a code', async () => {
  const start = await invoke('/oauth/start'); assert.equal(start.status, 302);
  const url = new URL(start.headers.Location); assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(url.searchParams.get('state').length >= 32); assert.ok(url.searchParams.get('code_challenge').length >= 32);
  const failed = await invoke('/oauth/callback?state=wrong&code=unused', { cookie: start.headers['Set-Cookie'].split(';')[0] });
  assert.equal(failed.status, 400);
  const gmail = await invoke('/oauth/start?gmail=1'); assert.equal(gmail.status, 302);
  const gmailUrl = new URL(gmail.headers.Location);
  assert.match(gmailUrl.searchParams.get('scope'), /gmail.readonly/);
  assert.doesNotMatch(gmailUrl.searchParams.get('scope'), /spreadsheets/, 'Gmail-first sign-in does not require Sheets');
});
test('saved templates belong to one owner; starters can be augmented without overwrite', async () => {
  const original = globalThis.fetch; const docs = new Map([['alice', { email: 'alice@example.com' }], ['bob', { email: 'bob@example.com' }]]);
  const response = (data, status = 200) => new Response(JSON.stringify(data), { status });
  const document = (path, value) => ({ name: `projects/test/databases/(default)/documents/crm_users/${path}`, fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, { stringValue: v }])), updateTime: '2026-10-06T00:00:00Z' });
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).includes('metadata.google.internal')) return response({ access_token: 'cloud', expires_in: 3600 });
    const path = String(url).split('/crm_users/')[1]?.split('?')[0];
    if (!path) throw new Error('Unexpected request');
    if (path.endsWith('/prompts')) return response({ documents: [...docs].filter(([key]) => key.startsWith(`${path}/`)).map(([key, value]) => document(key, value)) });
    if (options.method === 'PATCH') docs.set(path, Object.fromEntries(Object.entries(JSON.parse(options.body).fields).map(([k, v]) => [k, v.stringValue])));
    return docs.has(path) ? response(document(path, docs.get(path))) : response({}, 404);
  };
  try {
    const created = await invoke('/prompts/save', { method: 'POST', cookie: session('alice'), body: { title: 'Consulting prospects', text: 'Find prospects asking about product consulting, excluding job applications.' } });
    assert.equal(created.status, 200); const prompt = JSON.parse(created.body);
    assert.equal((await invoke('/prompts/save', { method: 'POST', cookie: session('bob'), body: { id: prompt.id, title: 'Stolen', text: 'Change another account template' } })).status, 404);
    const bob = JSON.parse((await invoke('/prompts', { cookie: session('bob') })).body);
    assert.equal(bob.prompts.length, 3); assert.ok(bob.prompts.every(item => item.illustrative));
    const alice = JSON.parse((await invoke('/prompts', { cookie: session('alice') })).body);
    assert.equal(alice.prompts.length, 4); assert.equal(alice.prompts.at(-1).text, prompt.text);
    assert.equal((await invoke('/prompts/save', { method: 'POST', cookie: session('alice'), origin: 'https://other.test', body: prompt })).status, 403);
  } finally { globalThis.fetch = original; }
});
test('customer isolation, explicit approval, origin checks, and once-only sending', async () => {
  const original = globalThis.fetch; const requests = [], docs = new Map(); let sent = 0;
  const user = { tokenCipher: security.encrypt({ accessToken: 'test', expiresAt: Date.now() + 3600000 }, key),
    scopes: 'https://www.googleapis.com/auth/gmail.send', gmailOptIn: 'true', sheetId: 'a'.repeat(30), tab: 'Customers',
    mapping: JSON.stringify({ name: 0, email: 1, company: -1, lastContact: 2, lastSale: -1, sales: -1, notes: -1, stage: 3 }) };
  const draftId = 'd'.repeat(24);
  docs.set('alice', user); docs.set('bob', user);
  docs.set('charlie', { ...user, gmailOptIn: 'false' });
  docs.set(`alice/drafts/${draftId}`, { status: 'awaiting_approval', sheetId: user.sheetId, tab: user.tab, row: '2', recipient: 'lead@example.com' });
  const response = (data, status = 200) => new Response(JSON.stringify(data), { status });
  globalThis.fetch = async (url, options = {}) => {
    requests.push(String(url));
    if (String(url).includes('metadata.google.internal')) return response({ access_token: 'cloud', expires_in: 3600 });
    if (String(url).includes('firestore.googleapis.com')) {
      const path = String(url).split('/crm_users/')[1].split('?')[0];
      if (options.method === 'PATCH') { const fields = JSON.parse(options.body).fields; docs.set(path, Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v.stringValue]))); }
      const value = docs.get(path); return value ? response({ fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, { stringValue: v }])), updateTime: '2026-10-06T00:00:00Z' }) : response({}, 404);
    }
    if (String(url).includes('sheets.googleapis.com')) return response(options.method === 'PUT' ? { updatedCells: 1 } : { values: [['Name', 'Email', 'Last contact', 'Stage'], ['Lead', 'lead@example.com', '2026-01-01', 'Hot']] });
    if (String(url).includes('gmail.googleapis.com')) { sent++; return response({ id: 'confirmed-message' }); }
    throw new Error('Unexpected network request');
  };
  try {
    const body = { draftId, approved: true, subject: 'Hello', message: 'A reviewed message' };
    assert.equal((await invoke('/lead/send', { method: 'POST', cookie: session('alice'), body: { ...body, approved: false } })).status, 400);
    assert.equal((await invoke('/lead/send', { method: 'POST', cookie: session('alice'), origin: 'https://other.test', body })).status, 403);
    assert.equal((await invoke('/lead/send', { method: 'POST', cookie: session('bob'), body })).status, 409);
    assert.equal((await invoke('/lead/send', { method: 'POST', cookie: session('charlie'), body })).status, 403,
      'a Google scope inherited from another project client must not activate Gmail without product opt-in');
    assert.equal(sent, 0);
    const successful = await invoke('/lead/send', { method: 'POST', cookie: session('alice'), body });
    assert.equal(successful.status, 200); assert.equal(sent, 1);
    const sendIndex = requests.findIndex(url => url.includes('gmail.googleapis.com'));
    const dateIndex = requests.findIndex(url => url.includes('valueInputOption=RAW'));
    assert.ok(dateIndex > sendIndex, 'last-contact date must follow a confirmed send');
    assert.equal((await invoke('/lead/send', { method: 'POST', cookie: session('alice'), body })).status, 409); assert.equal(sent, 1);
  } finally { globalThis.fetch = original; }
});
test('Gmail drafts bind owner, recipient, and source version; approved sends stay in the thread', async () => {
  const original = globalThis.fetch, docs = new Map(); let sends = 0, changed = false, payload;
  const id = '12345678abcdabcd', lead = { id: `gmail-${id}`, source: 'gmail', threadId: id, email: 'lead@example.com', name: 'Lead', lastMessageId: 'last', replyMessageId: '<reply@example.com>', subject: 'Consulting', recommendedDraft: 'A grounded follow-up' };
  const user = { email: 'owner@example.com', tokenCipher: security.encrypt({ accessToken: 'test', expiresAt: Date.now() + 3600000 }, key), scopes: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send', gmailOptIn: 'true' };
  docs.set('alice', user); docs.set('bob', user); docs.set(`alice/gmail_leads/${lead.id}`, { lead: JSON.stringify(lead) });
  const response = (data, status = 200) => new Response(JSON.stringify(data), { status });
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).includes('metadata.google.internal')) return response({ access_token: 'cloud', expires_in: 3600 });
    if (String(url).includes('firestore.googleapis.com')) {
      const path = String(url).split('/crm_users/')[1].split('?')[0];
      if (options.method === 'PATCH') docs.set(path, Object.fromEntries(Object.entries(JSON.parse(options.body).fields).map(([k, v]) => [k, v.stringValue])));
      const value = docs.get(path); return value ? response({ fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, { stringValue: v }])), updateTime: '2026-10-06T00:00:00Z' }) : response({}, 404);
    }
    if (String(url).includes('/threads/')) return response({ id, messages: [{ id: changed ? 'new-reply' : 'last', internalDate: String(Date.now() - 10000), labelIds: ['INBOX'], payload: { headers: [{ name: 'From', value: 'Lead <lead@example.com>' }, { name: 'To', value: 'owner@example.com' }, { name: 'Subject', value: 'Consulting' }] } }] });
    if (String(url).endsWith('/messages/send')) { sends++; payload = JSON.parse(options.body); return response({ id: 'gmail-confirmed' }); }
    if (String(url).includes('sheets.googleapis.com')) throw new Error('Gmail-only workflow must not write Sheets');
    throw new Error('Unexpected request');
  };
  try {
    const body = { source: 'gmail', id: lead.id, email: lead.email };
    assert.equal((await invoke('/lead/draft', { method: 'POST', cookie: session('bob'), body })).status, 409);
    assert.equal((await invoke('/lead/draft', { method: 'POST', cookie: session('alice'), body: { ...body, email: 'other@example.com' } })).status, 409);
    const created = await invoke('/lead/draft', { method: 'POST', cookie: session('alice'), body }); assert.equal(created.status, 200);
    const draft = JSON.parse(created.body), approved = { draftId: draft.id, approved: true, subject: draft.subject, message: draft.message };
    changed = true; assert.equal((await invoke('/lead/send', { method: 'POST', cookie: session('alice'), body: approved })).status, 409); assert.equal(sends, 0);
    changed = false; assert.equal((await invoke('/lead/send', { method: 'POST', cookie: session('alice'), body: { ...approved, approved: false } })).status, 400);
    assert.equal((await invoke('/lead/send', { method: 'POST', cookie: session('alice'), body: approved })).status, 200); assert.equal(sends, 1); assert.equal(payload.threadId, id);
    const mime = Buffer.from(payload.raw, 'base64url').toString(); assert.match(mime, /To: lead@example.com/); assert.match(mime, /In-Reply-To: <reply@example.com>/);
    assert.equal((await invoke('/lead/send', { method: 'POST', cookie: session('alice'), body: approved })).status, 409); assert.equal(sends, 1);
  } finally { globalThis.fetch = original; }
});
