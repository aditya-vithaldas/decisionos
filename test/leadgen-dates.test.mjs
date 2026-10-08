import test from 'node:test';
import assert from 'node:assert/strict';
import { verifiedPostDate, xPostDate } from '../scripts/leadgen-dates.mjs';
import { checkedResults } from '../scripts/leadgen-api.mjs';

test('posting dates require cited evidence and stay inside the last 30 days', () => {
  const today = '2026-10-08';
  const check = (postedAt, dateEvidence, evidence = dateEvidence) => verifiedPostDate({ postedAt, dateEvidence }, { evidence }, today);
  assert.equal(check('2026-10-06', 'Posted 2 days ago'), '2026-10-06');
  assert.equal(check('2026-10-07', 'Posted yesterday'), '2026-10-07');
  assert.equal(check('2026-09-09', 'September 9, 2026'), '2026-09-09');
  assert.equal(check('2026-10-01', '1 Oct 2026'), '2026-10-01');
  assert.equal(check('2026-09-08', '2026-09-08'), null, '30 days ago is outside the 30-calendar-day window');
  assert.equal(check('2026-10-09', '2026-10-09'), null, 'future dates are excluded');
  assert.equal(check('2026-10-07', '2026-10-06'), null, 'date must agree with the evidence');
  assert.equal(check('2026-10-07', '2026-10-07', 'No posting date'), null, 'invented evidence is excluded');
  assert.equal(check('2026-10-07', ''), null);
});

test('fresh results exclude old and undated posts and sort newest before fit', () => {
  const dates = ['2026-09-30', '2026-10-07', '2025-10-07', null];
  const sources = dates.map((date, i) => ({ url: `https://reddit.com/r/agents/comments/abc12${i}/help/`, title: 'Fixture', evidence: date ? `Posted ${date}. Help choosing an agent harness.` : 'Help choosing an agent harness.' }));
  const rows = dates.map((date, sourceIndex) => ({ sourceIndex, isQuestion: true, question: 'Which agent harness?', reason: 'Relevant offering', postedAt: date, dateEvidence: date ? `Posted ${date}` : '', fit: sourceIndex === 0 ? 'Strong' : 'Possible' }));
  const results = checkedResults(rows, sources, ['Reddit'], '2026-10-08');
  assert.deepEqual(results.map(item => item.postedAt), ['2026-10-07', '2026-09-30']);
});

test('X posting dates come from the cited status ID without trusting a model date', () => {
  assert.equal(xPostDate('https://x.com/Wikipedia/status/1541815603606036480'), '2022-06-28');
  const id = ((BigInt(Date.parse('2026-10-07T12:00:00Z')) - 1288834974657n) << 22n).toString();
  assert.equal(xPostDate(`https://mobile.twitter.com/person/status/${id}`), '2026-10-07');
  assert.equal(xPostDate(`https://x.com/i/web/status/${id}`), '2026-10-07');
  assert.equal(xPostDate(`https://x.com.attacker.com/person/status/${id}`), null);
  assert.equal(xPostDate('https://x.com/person/status/123'), null);
});
