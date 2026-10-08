// Only public HTTPS URLs can leave the search pipeline.
export function publicURL(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname) || /(?:^|\.)(localhost|local|internal|test|example|invalid)$/.test(url.hostname)) return null;
    url.hash = ''; return url.href;
  } catch { return null; }
}
export function postPlatform(value) {
  const safe = publicURL(value); if (!safe) return null;
  const { hostname, pathname } = new URL(safe), host = hostname.replace(/^www\./, '');
  let path; try { path = decodeURIComponent(pathname); } catch { return null; }
  if (['reddit.com', 'old.reddit.com', 'new.reddit.com'].includes(host) && /^\/r\/[^/]+\/comments\/[a-z0-9]+(?:\/|$)/i.test(path)) return 'Reddit';
  if ((host === 'linkedin.com' || /^(?:[a-z]{2}|m)\.linkedin\.com$/.test(host)) && /^\/(?:posts\/[^/]+|feed\/update\/urn:li:activity:\d+)/.test(path)) return 'LinkedIn';
  if (['x.com', 'twitter.com', 'mobile.twitter.com', 'mobile.x.com', 'm.twitter.com'].includes(host) && /^\/(?:[^/]+|i\/web)\/status\/\d+(?:\/|$)/.test(path)) return 'X';
  return null;
}

export async function resolveGroundingURL(value, fetcher = fetch) {
  let url = publicURL(value); if (!url) return null;
  for (let hop = 0; hop < 3; hop++) {
    const parsed = new URL(url);
    if (parsed.hostname !== 'vertexaisearch.cloud.google.com') return url;
    if (!parsed.pathname.startsWith('/grounding-api-redirect/')) return null;
    try {
      const response = await fetcher(url, { redirect: 'manual', signal: AbortSignal.timeout(8000) });
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (![301, 302, 303, 307, 308].includes(response.status) || !location) return null;
      url = publicURL(new URL(location, url).href); if (!url) return null;
    } catch { return null; }
  }
  return null;
}

export async function resolveGroundedSources(found, fetcher = fetch) {
  const resolved = await Promise.all(found.sources.map(async source => {
    const url = await resolveGroundingURL(source.url, fetcher);
    return url ? { ...source, url, citationURL: source.url } : null;
  }));
  return { ...found, sources: resolved.filter(Boolean) };
}
