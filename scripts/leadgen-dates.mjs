const day = 86400000;

// Accept a posting date only when the provider's cited evidence supports it.
export function verifiedPostDate(row, source, today) {
  const evidence = typeof row.dateEvidence === 'string' ? row.dateEvidence.trim() : '';
  if (!evidence || !source.evidence.includes(evidence) || !/^\d{4}-\d{2}-\d{2}$/.test(row.postedAt || '')) return null;
  const now = Date.parse(`${today}T00:00:00Z`);
  let supported;
  const iso = evidence.match(/\b\d{4}-\d{2}-\d{2}\b/);
  const named = evidence.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b/i)
    || evidence.match(/\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}\b/i);
  const relative = evidence.match(/\b(\d+)\s+(minute|hour|day|week)s?\s+ago\b/i);
  if (iso) supported = Date.parse(`${iso[0]}T00:00:00Z`);
  else if (named) supported = Date.parse(`${named[0]} UTC`);
  else if (relative) supported = now - Number(relative[1]) * (relative[2].toLowerCase() === 'week' ? 7 * day : relative[2].toLowerCase() === 'day' ? day : 0);
  else if (/\byesterday\b/i.test(evidence)) supported = now - day;
  else if (/\btoday\b/i.test(evidence)) supported = now;
  if (!Number.isFinite(supported)) return null;
  const posted = Date.parse(`${row.postedAt}T00:00:00Z`);
  if (!Number.isFinite(posted) || new Date(posted).toISOString().slice(0, 10) !== row.postedAt || posted !== supported || posted > now || now - posted >= 30 * day) return null;
  return row.postedAt;
}
