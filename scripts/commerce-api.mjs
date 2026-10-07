const upstream = 'https://ecommerce-storefront.decisionos.me';
export async function commerceSession(req, res) {
  const reply = (status, value) => res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify(value));
  if (!['GET', 'POST'].includes(req.method)) return reply(405, { error: 'Method not allowed.' });
  try {
    let body;
    if (req.method === 'POST') {
      const allowed = new Set(['https://decisionaxis.co', 'https://www.decisionaxis.co', 'https://decisionos.me']);
      if (process.env.NODE_ENV !== 'production') allowed.add(`http://${req.headers.host}`);
      if (!allowed.has(req.headers.origin)) return reply(403, { error: 'Start live shopping from Decision Axis.' });
      let length = 0; const chunks = [];
      for await (const chunk of req) { const bytes = Buffer.from(chunk); length += bytes.length; if (length > 50000) return reply(413, { error: 'Connection request too large.' }); chunks.push(bytes); }
      body = Buffer.concat(chunks).toString();
      if (!body.startsWith('v=0')) return reply(400, { error: 'Invalid voice connection request.' });
    }
    const response = await fetch(`${upstream}/api/realtime`, { method: req.method,
      ...(body ? { body, headers: { Origin: upstream, 'Content-Type': 'application/sdp' } } : {}),
      signal: AbortSignal.timeout(30000), redirect: 'error' });
    const content = await response.text();
    if (content.length > 200000) return reply(502, { error: 'Unexpected voice service response.' });
    res.writeHead(response.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }).end(content);
  } catch { return reply(502, { error: 'Live shopping is temporarily unavailable. Please use text search or try again.' }); }
}
