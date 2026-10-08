import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { checkedProfile, publicURL, postPlatform, groundedSources, checkedResults, createLeadgenService } from '../scripts/leadgen-api.mjs';
import { createCrmHandler, crmSecurityForTests as crypto } from '../scripts/crm-api.mjs';

const profile = { company: 'Fixture B2B', website: 'https://fixture-b2b.com/', summary: 'Agent harness implementation for teams.', questions: ['How do I set up an agent harness?'] };
const today = new Date().toISOString().slice(0, 10);
const source = { url: 'https://www.reddit.com/r/agents/comments/abc123/harness/', title: 'Help with an agent harness', evidence: `Posted ${today}. A team is asking how to set up an agent harness.` };
const row = { postedAt: today, dateEvidence: `Posted ${today}`, sourceIndex: 0, isQuestion: true, question: 'How can our team set up an agent harness?', reason: 'The company implements agent harnesses.', angle: 'Explain a concrete first step.', fit: 'Strong' };
const key = Buffer.alloc(32, 7), config = { key };

test('source URLs must be individual posts on exact public HTTPS platform hosts', () => {
  assert.equal(postPlatform(source.url), 'Reddit');
  assert.equal(postPlatform('https://linkedin.com/posts/someone_harness-activity-123'), 'LinkedIn');
  assert.equal(postPlatform('https://linkedin.com/feed/update/urn:li:activity:123'), 'LinkedIn');
  assert.equal(postPlatform('https://twitter.com/person/status/123'), 'X');
  assert.equal(postPlatform('https://x.com/i/web/status/123'), 'X');
  assert.equal(postPlatform('https://mobile.twitter.com/person/status/123'), 'X');
  assert.equal(postPlatform('https://uk.linkedin.com/feed/update/urn%3Ali%3Aactivity%3A123'), 'LinkedIn');
  assert.equal(postPlatform('https://old.reddit.com/r/agents/comments/abc123/help/'), 'Reddit');
  assert.equal(postPlatform('https://linkedin.com.attacker.com/posts/person'), null);
  for (const url of ['https://linkedin.com/company/acme', 'https://reddit.com/r/agents', 'https://x.com/search?q=agents', 'https://reddit.com.attacker.com/r/a/comments/abc/', 'http://x.com/person/status/123', 'javascript:alert(1)', 'https://user:password@x.com/person/status/123']) assert.equal(postPlatform(url), null, url);
  for (const url of ['http://127.0.0.1', 'https://127.0.0.1', 'https://localhost', 'https://metadata.google.internal', 'https://[::1]']) assert.equal(publicURL(url), null, url);
  assert.throws(() => checkedProfile(undefined), /Review/);
  assert.throws(() => checkedProfile({ ...profile, website: 'http://localhost' }), /public HTTPS/);
});

test('source evidence comes from valid provider citation ranges, never answer links', () => {
  const evidence = 'The team needs a harness.';
  const body = { steps: [{ type: 'google_search_result', result: [{ search_suggestions: '<p>Search</p>' }] }, { type: 'model_output', content: [{ type: 'text', text: evidence, annotations: [
    { type: 'url_citation', url: source.url, title: source.title, start_index: 0, end_index: evidence.length },
    { type: 'url_citation', url: 'https://x.com/p/status/12', start_index: -1, end_index: 4 },
    { type: 'url_citation', url: 'javascript:alert(1)', start_index: 0, end_index: 4 },
    { type: 'url_citation', url: 'https://x.com/p/status/13', start_index: 0, end_index: 999 },
  ] }] }] };
  const found = groundedSources(body); assert.equal(found.sources.length, 1); assert.equal(found.sources[0].evidence, evidence); assert.equal(found.suggestions, '<p>Search</p>');
  assert.equal(groundedSources({ output_text: `See ${source.url}` }).sources.length, 0);
});

test('results reject invented references, wrong platforms and nonquestions; deduplicate post URLs', () => {
  const sources = [source, { ...source, url: source.url + '?utm_source=anything' }, { ...source, url: 'https://reddit.com/r/agents' }];
  const results = checkedResults([row, { ...row, sourceIndex: 1 }, { ...row, sourceIndex: 2 }, { ...row, sourceIndex: 99 }, { ...row, sourceIndex: 0, isQuestion: false }], sources, ['Reddit']);
  assert.equal(results.length, 1); assert.equal(results[0].url, source.url); assert.equal(results[0].status, 'new');
  assert.equal(checkedResults([row], [source], ['X']).length, 0);
});

function harness() {
  const users = new Map([['alice', {}], ['bob', {}]]); let empty = false;
  const research = async (_instruction, _input, grounded) => grounded ? { sources: empty ? [] : [source], suggestions: '' } : { results: [row] };
  const service = createLeadgenService({ research, save: async (uid, value) => { users.set(uid, value); }, encrypt: crypto.encrypt, decrypt: crypto.decrypt });
  const invoke = (path, uid = 'alice', body = {}, method = 'POST') => service(path, { method }, uid, users.get(uid), config, body);
  return { users, invoke, empty: () => { empty = true; } };
}

test('encrypted account state isolates leads and status changes; saved results survive empty searches', async () => {
  const h = harness(), first = await h.invoke('/search', 'alice', { profile, platforms: ['Reddit', 'X'] });
  assert.equal(first.results.length, 1); assert.deepEqual(first.coverage, [{ platform: 'Reddit', count: 1 }, { platform: 'X', count: 0 }]);
  assert.ok(h.users.get('alice').leadgenCipher); assert.doesNotMatch(h.users.get('alice').leadgenCipher, /harness/);
  assert.deepEqual((await h.invoke('/state', 'bob', {}, 'GET')).results, []);
  await assert.rejects(h.invoke('/status', 'bob', { id: first.results[0].id, status: 'saved' }), /Refresh/);
  await h.invoke('/status', 'alice', { id: first.results[0].id, status: 'saved' }); h.empty();
  const next = await h.invoke('/search', 'alice', { profile, platforms: ['Reddit'] });
  assert.equal(next.results[0].status, 'saved'); assert.equal(next.coverage[0].count, 0);
  const otherCompany = await h.invoke('/search', 'alice', { profile: { ...profile, company: 'Another company' }, platforms: ['Reddit'] });
  assert.equal(otherCompany.results.length, 0, 'leads must not carry into a different company');
});

test('empty research returns no fictional prospects and budgets fail closed', async () => {
  const h = harness(); h.empty();
  for (let i = 0; i < 12; i++) assert.deepEqual((await h.invoke('/search', 'alice', { profile, platforms: ['Reddit'] })).results, []);
  await assert.rejects(h.invoke('/search', 'alice', { profile, platforms: ['Reddit'] }), error => error.status === 429);
  await assert.rejects(h.invoke('/search', 'bob', { profile, platforms: [] }), /Choose at least/);
  await assert.rejects(h.invoke('/status', 'bob', { status: 'posted' }), /valid lead status/);
});

test('account mutations cannot overwrite an in-flight search', async () => {
  let release; const wait = new Promise(resolve => { release = resolve; });
  const service = createLeadgenService({ research: async () => { await wait; return { sources: [], suggestions: '' }; }, save: async () => {}, encrypt: crypto.encrypt, decrypt: crypto.decrypt });
  const pending = service('/search', { method: 'POST' }, 'alice', {}, config, { profile, platforms: ['Reddit'] });
  await assert.rejects(service('/status', { method: 'POST' }, 'alice', {}, config, { id: 'a', status: 'saved' }), error => error.status === 409);
  release(); assert.deepEqual((await pending).results, []);
});

test('existing OAuth routes preserve identity-only leadgen return, session and CSRF boundaries', async () => {
  const previousEnv = { ...process.env }, previousFetch = globalThis.fetch;
  const secret = 'fixture-session-signing-key-at-least-32-characters';
  Object.assign(process.env, { CRM_GOOGLE_CLIENT_ID: 'fixture-client', CRM_GOOGLE_CLIENT_SECRET: 'fixture-client-secret', CRM_SESSION_SECRET: secret, CRM_TOKEN_KEY: key.toString('base64'), CRM_REDIRECT_URI: 'https://fixture-b2b.com/crm/api/oauth/callback' });
  globalThis.fetch = async url => String(url).includes('metadata.google.internal') ? new Response(JSON.stringify({ access_token: 'fixture', expires_in: 3600 })) : new Response(JSON.stringify({ fields: { email: { stringValue: 'alice@fixture-b2b.com' } } }));
  const handler = createCrmHandler();
  async function invoke(path, method = 'GET', body, cookie, origin) {
    const req = Readable.from(body ? [JSON.stringify(body)] : []); Object.assign(req, { url: `/crm/api${path}`, method, headers: { cookie, origin, 'content-type': 'application/json' } });
    const res = { setHeader() {}, writeHead(status, headers) { this.status = status; this.headers = headers; return this; }, end(body) { this.body = body; } };
    await handler(req, res); return res;
  }
  try {
    const start = await invoke('/oauth/start?identity=1&return=leadgen'), url = new URL(start.headers.Location);
    assert.equal(url.searchParams.get('scope'), 'openid email profile'); assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    const sealed = start.headers['Set-Cookie'].split(';')[0].slice('crm_oauth='.length);
    assert.equal(crypto.unseal(sealed, secret).destination, '/leadgen');
    assert.equal((await invoke('/leadgen/state')).status, 401);
    const cookie = 'crm_session=' + crypto.seal({ uid: 'alice', exp: Date.now() + 10000 }, secret);
    assert.equal((await invoke('/leadgen/state', 'GET', null, cookie)).status, 200);
    assert.equal((await invoke('/leadgen/search', 'POST', { profile, platforms: ['Reddit'] }, cookie, 'https://attacker.com')).status, 403);
  } finally { globalThis.fetch = previousFetch; for (const k of Object.keys(process.env)) if (!(k in previousEnv)) delete process.env[k]; Object.assign(process.env, previousEnv); }
});
