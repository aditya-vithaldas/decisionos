import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveGroundingURL, resolveGroundedSources } from '../scripts/leadgen-urls.mjs';

const redirect = 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/fixture';
const post = 'https://reddit.com/r/agents/comments/abc123/help/';
test('Google citation redirects resolve without fetching the destination website', async () => {
  const calls = [];
  const found = await resolveGroundedSources({ sources: [{ url: redirect, evidence: 'A cited question.' }], suggestions: '' }, async (url, options) => {
    calls.push(url); assert.equal(options.redirect, 'manual');
    return new Response(null, { status: 302, headers: { location: post } });
  });
  assert.deepEqual(calls, [redirect]); assert.equal(found.sources[0].url, post); assert.equal(found.sources[0].citationURL, redirect);
});
test('redirects cannot fetch private addresses, arbitrary Google paths, credentials, or loops', async () => {
  let calls = 0;
  const fetcher = async () => { calls++; return new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/' } }); };
  assert.equal(await resolveGroundingURL(redirect, fetcher), null); assert.equal(calls, 1);
  assert.equal(await resolveGroundingURL('https://vertexaisearch.cloud.google.com/other', fetcher), null); assert.equal(calls, 1);
  assert.equal(await resolveGroundingURL('https://user:password@reddit.com/r/a/comments/abc/', fetcher), null);
  calls = 0;
  assert.equal(await resolveGroundingURL(redirect, async () => { calls++; return new Response(null, { status: 302, headers: { location: redirect } }); }), null); assert.equal(calls, 3);
});
test('unresolvable citations are dropped while direct citations stay available', async () => {
  const found = await resolveGroundedSources({ sources: [{ url: redirect }, { url: post }] }, async () => { throw Error('Timed out'); });
  assert.equal(found.sources.length, 1); assert.equal(found.sources[0].url, post);
});
