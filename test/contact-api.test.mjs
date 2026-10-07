import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createContactHandler } from '../scripts/contact-api.mjs';

async function withServer(options, run) {
  const server = createServer(createContactHandler(options));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

function submit(base, values = {}, headers = {}) {
  return fetch(`${base}/api/contact`, {
    method: 'POST',
    headers: {
      Origin: 'https://decisionaxis.co',
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Forwarded-For': '192.0.2.42',
      ...headers,
    },
    body: new URLSearchParams({
      name: 'Ada Lovelace', company: 'Analytical Engines',
      email: 'ada@example.com', inquiry: 'Build a dashboard.', ...values,
    }),
  });
}

test('stores a valid inquiry before notifying the owner', async () => {
  const steps = [];
  await withServer({
    configured: () => true,
    save: async entry => { steps.push(['save', entry.email]); return 'submission-1'; },
    notify: async (entry, id) => { steps.push(['notify', entry.email, id]); return 'email-1'; },
    markNotified: async (id, emailId) => { steps.push(['mark', id, emailId]); },
  }, async base => {
    const response = await submit(base);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      saved: true, notified: true, message: 'Thanks — your inquiry has been received.',
    });
  });
  assert.deepEqual(steps, [
    ['save', 'ada@example.com'],
    ['notify', 'ada@example.com', 'submission-1'],
    ['mark', 'submission-1', 'email-1'],
  ]);
});

test('rejects invalid input and origins without storing or sending', async () => {
  let calls = 0;
  await withServer({
    configured: () => true,
    save: async () => { calls++; return 'submission-2'; },
    notify: async () => { calls++; return 'email-2'; },
  }, async base => {
    assert.equal((await submit(base, { email: 'invalid' })).status, 400);
    assert.equal((await submit(base, {}, { Origin: 'https://evil.example' })).status, 403);
    assert.equal(calls, 0);
  });
});

test('stores inquiries successfully when the email service is unconfigured', async () => {
  let stored;
  await withServer({
    configured: () => false,
    save: async entry => { stored = entry; return 'submission-2'; },
    notify: async () => { throw new Error('must not notify'); },
  }, async base => {
    const response = await submit(base);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.saved, true);
    assert.equal(result.notified, false);
    assert.match(result.message, /inquiry has been received/);
  });
  assert.equal(stored?.email, 'ada@example.com');
});

test('does not claim success when database storage fails', async () => {
  let notified = false;
  await withServer({
    configured: () => false,
    save: async () => { throw new Error('database unavailable'); },
    notify: async () => { notified = true; },
  }, async base => {
    const response = await submit(base);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).saved, undefined);
  });
  assert.equal(notified, false);
});

test('keeps a stored inquiry when notification fails', async () => {
  await withServer({
    configured: () => true,
    save: async () => 'submission-3',
    notify: async () => { throw new Error('provider unavailable'); },
  }, async base => {
    const response = await submit(base);
    assert.equal(response.status, 202);
    const result = await response.json();
    assert.equal(result.saved, true);
    assert.equal(result.notified, false);
    assert.match(result.message, /inquiry has been received/);
  });
});
