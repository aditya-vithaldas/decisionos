import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createPublicLeadgenHandler } from '../scripts/leadgen-api.mjs';

test('public progress arrives before research completes and finishes with the profile', async () => {
  let release;
  const waiting = new Promise(resolve => { release = resolve; });
  const profile = { company: 'Fixture', website: 'https://fixture-b2b.com/', summary: 'Helps teams build AI products.', questions: ['Build or buy AI?'] };
  const server = createServer(createPublicLeadgenHandler({ research: async (_prompt, _input, grounded) => {
    if (grounded) { await waiting; return { sources: [{ url: profile.website, title: 'Fixture', evidence: profile.summary }], suggestions: '' }; }
    return profile;
  } }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/leadgen/recommend`, {
      method: 'POST', headers: { origin: 'https://decisionaxis.co', 'content-type': 'application/json' },
      body: JSON.stringify({ website: profile.website, progress: true }),
    });
    assert.match(response.headers.get('content-type'), /ndjson/);
    const reader = response.body.getReader();
    const first = new TextDecoder().decode((await reader.read()).value);
    assert.equal(JSON.parse(first.trim()).stage, 'website');
    release();
    let rest = ''; while (true) { const { value, done } = await reader.read(); if (done) break; rest += new TextDecoder().decode(value); }
    const events = rest.trim().split('\n').map(JSON.parse);
    assert.equal(events[0].stage, 'questions');
    assert.deepEqual(events.at(-1).data.profile.questions, profile.questions);
    assert.equal(events.at(-1).type, 'result');
  } finally { release(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('a failed streamed search ends with an error event, never a success result', async () => {
  const server = createServer(createPublicLeadgenHandler({ research: async () => { throw Error('Provider unavailable'); } }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/leadgen/recommend`, {
      method: 'POST', headers: { origin: 'https://decisionaxis.co', 'content-type': 'application/json' },
      body: JSON.stringify({ website: 'https://fixture-b2b.com/', progress: true }),
    });
    const events = (await response.text()).trim().split('\n').map(JSON.parse);
    assert.equal(events.at(-1).type, 'error');
    assert.ok(!events.some(event => event.type === 'result'));
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
