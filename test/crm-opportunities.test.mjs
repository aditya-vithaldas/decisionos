import test from 'node:test';
import assert from 'node:assert/strict';
import { inferMapping, buildOpportunities, validateAnalysis, draftOutreach } from '../scripts/crm-opportunities.mjs';

const values = [
  ['Customer Name', 'Email', 'Last Contact', 'Last Sale', 'Notes', 'Decision Axis stage'],
  ['Maya Chen', 'maya@example.com', '2026-06-01', '2026-05-01', 'Asked about renewal', ''],
  ['Lee Patel', 'lee@example.com', '2026-09-25', '', '', 'Cold'],
];

test('maps existing sheet headers and cites source rows', () => {
  const mapping = inferMapping(values[0]);
  const leads = buildOpportunities(values, mapping, new Date('2026-10-06T00:00:00Z'));
  assert.equal(leads[0].stage, 'Hot');
  assert.match(leads[0].reason, /127 days/);
  assert.ok(leads[0].evidence.some(line => line.includes('row 2')));
  assert.equal(leads[1].stage, 'Cold');
});

test('model cannot invent rows or repeat purchases without a sale', () => {
  const leads = buildOpportunities(values, inferMapping(values[0]), new Date('2026-10-06T00:00:00Z'));
  const checked = validateAnalysis({ opportunities: [
    { row: 3, angle: 'repeat_purchase', why: 'Maybe buy again' },
    { row: 999, angle: 'follow_up', why: 'Fake' },
  ] }, leads);
  assert.equal(checked.length, 2);
  assert.equal(checked[1].analysis.angle, 'insufficient_evidence');
  assert.ok(!checked.some(lead => lead.row === 999));
  assert.match(draftOutreach(checked[1]), /Hi Lee/);
});

test('Sheets date serials work independently of locale; ambiguous text dates stay uncertain', () => {
  const rows = [['Name', 'Last contact'], ['Alex', (Date.UTC(2026, 5, 1) - Date.UTC(1899, 11, 30)) / 86400000], ['Sam', '06/10/2026']];
  const leads = buildOpportunities(rows, inferMapping(rows[0]), new Date('2026-10-06T00:00:00Z'));
  assert.equal(leads[0].lastContact, '2026-06-01'); assert.equal(leads[0].daysSinceContact, 127);
  assert.equal(leads[1].daysSinceContact, null); assert.equal(leads[1].stage, 'Cold');
});
