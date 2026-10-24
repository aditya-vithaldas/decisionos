import test from 'node:test';
import assert from 'node:assert/strict';
import { demoAPI } from '../products/meridian/server/gateway.mjs';

async function preflight(origin) {
  const headers = {};
  const res = {
    setHeader(name, value) { headers[name] = value; },
    writeHead(status) { this.status = status; return this; },
    end() {},
  };
  await demoAPI({ method: 'OPTIONS', url: '/query', headers: { origin } }, res);
  return { status: res.status, headers };
}

test('analytics permits preflights from the current and legacy website domains', async () => {
  for (const origin of ['https://decisionaxis.co', 'https://www.decisionaxis.co', 'https://decisionos.me', 'https://www.decisionos.me']) {
    const { status, headers } = await preflight(origin);
    assert.equal(status, 204, origin);
    assert.equal(headers['Access-Control-Allow-Origin'], origin);
    assert.equal(headers.Vary, 'Origin');
    assert.equal(headers['Access-Control-Allow-Headers'], 'Content-Type');
    assert.equal(headers['Access-Control-Allow-Methods'], 'GET,POST,OPTIONS');
  }
});

test('analytics rejects unrelated, lookalike, and missing origins', async () => {
  for (const origin of ['https://example.com', 'https://decisionaxis.co.example.com', 'http://decisionaxis.co', undefined]) {
    const { status, headers } = await preflight(origin);
    assert.equal(status, 403, origin);
    assert.equal(headers['Access-Control-Allow-Origin'], undefined);
  }
});
