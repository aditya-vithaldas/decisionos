import test from 'node:test';
import assert from 'node:assert/strict';
import { searchPlatforms } from '../scripts/leadgen-search.mjs';

test('each platform gets its own request; off-platform sources are excluded and partial failures remain visible', async () => {
  const requests = [];
  const found = await searchPlatforms(async (_instruction, input) => {
    requests.push(input.queries.map(q => q.platform));
    if (input.queries[0].platform === 'X') throw Error('Provider unavailable');
    return { sources: [{ url: 'https://reddit.com/r/agents/comments/abc123/help/' }, { url: 'https://linkedin.com/company/acme' }], suggestions: '<p>Search suggestions</p>' };
  }, 'Find relevant buyer questions.', { profile: { company: 'Fixture company' }, queries: [{ platform: 'Reddit', query: 'site:reddit.com/r/ agents' }, { platform: 'X', query: 'site:x.com agents' }], today: '2026-10-08' });
  assert.deepEqual(requests, [['Reddit'], ['X']]); assert.equal(found.sources.length, 1);
  assert.deepEqual(found.failedPlatforms, ['X']); assert.match(found.suggestions, /Search suggestions/);
});

test('total provider failure is an error rather than a zero-match success', async () => {
  await assert.rejects(searchPlatforms(async () => { throw Error('Unavailable'); }, 'Find buyer questions.', { queries: [{ platform: 'Reddit' }] }), error => error.status === 502);
});
