// Voice onboarding: mint a single-use Gemini Live token so the browser can talk
// to Gemini without ever seeing GEMINI_API_KEY. Same guards as the Meridian demo.
const recent = new Map();
const ALLOWED = ['https://decisionaxis.co', 'https://www.decisionaxis.co', 'https://decisionos.me', 'https://www.decisionos.me'];
const json = (res, status, body) => res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }).end(JSON.stringify(body));

export function createOnboardingHandler({ key = () => process.env.GEMINI_API_KEY, request = fetch } = {}) {
  return async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path !== '/api/onboarding/session') return json(res, 404, { error: 'Not found' });
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { error: 'Use POST' }); }
    const origin = req.headers.origin, host = req.headers.host;
    // Same-site pages only: the public domains, or the host serving this page (local preview, tagged revisions).
    if (!origin || ![...ALLOWED, `http://${host}`, `https://${host}`].includes(origin)) return json(res, 403, { error: 'Open the interview on DecisionAxis.' });
    const caller = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;
    const now = Date.now();
    for (const [id, entry] of recent) if (now - entry.start > 60000) recent.delete(id);
    const bucket = recent.get(caller) || { start: now, count: 0 };
    if (bucket.count >= 10) return json(res, 429, { error: 'Please wait a minute before starting another interview.' });
    bucket.count++; recent.set(caller, bucket);
    try {
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 512) return json(res, 413, { error: 'Request too large' }); }
      let data; try { data = JSON.parse(body || '{}'); } catch { return json(res, 400, { error: 'Invalid JSON' }); }
      if (data.model !== 'gemini-3.8-live') return json(res, 400, { error: 'Unknown live model' });
      if (!key()) return json(res, 503, { error: 'Voice interviews are not configured on this server yet.' });
      const response = await request('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
        method: 'POST',
        headers: { 'x-goog-api-key': key(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ uses: 1, expireTime: new Date(now + 30 * 60000).toISOString(), newSessionExpireTime: new Date(now + 60000).toISOString() }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) { console.error('Onboarding Gemini token failed', response.status); return json(res, 502, { error: 'Could not start the interview. Please try again shortly.' }); }
      const result = await response.json();
      if (typeof result.name !== 'string') throw Error('Missing token');
      return json(res, 200, { token: result.name });
    } catch { return json(res, 502, { error: 'Live connection unavailable. Please try again.' }); }
  };
}
