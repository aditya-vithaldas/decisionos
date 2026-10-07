import { randomUUID } from 'node:crypto';

const recipient = 'aditya.vithaldas@gmail.com';
const allowedOrigins = new Set([
  'https://decisionaxis.co', 'https://www.decisionaxis.co',
  'https://decisionos.me', 'https://www.decisionos.me',
  'http://localhost:4173', 'http://127.0.0.1:4173',
]);
const attempts = new Map();
let cachedToken;
let tokenExpires = 0;
let cachedProject;

const field = value => ({ stringValue: value });
const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max + 1) : '';
const emailValid = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const wantsJSON = req => (req.headers.accept || '').includes('application/json');
const escapeHTML = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function reply(req, res, status, body) {
  if (wantsJSON(req)) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  } else if (status < 300 && body.saved) {
    res.writeHead(303, { Location: '/thanks.html', 'Cache-Control': 'no-store' });
    res.end();
  } else {
    res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Contact Decision Axis</title><main><h1>${status < 300 ? 'Inquiry received' : 'Could not send inquiry'}</h1><p>${escapeHTML(body.message || body.error || 'Please try again shortly.')}</p><p><a href="/#contact">Back to the form</a></p></main></html>`);
  }
}

async function metadata(path) {
  const response = await fetch(`http://metadata.google.internal/computeMetadata/v1/${path}`, {
    headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Cloud identity unavailable');
  return response;
}

async function cloudToken() {
  if (cachedToken && Date.now() < tokenExpires) return cachedToken;
  const data = await (await metadata('instance/service-accounts/default/token')).json();
  if (!data.access_token) throw new Error('Cloud identity unavailable');
  cachedToken = data.access_token;
  tokenExpires = Date.now() + Math.max(60, Number(data.expires_in || 300) - 60) * 1000;
  return cachedToken;
}

async function firestoreURL(id) {
  cachedProject ||= process.env.CONTACT_FIRESTORE_PROJECT || (await (await metadata('project/project-id')).text()).trim();
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cachedProject)}/databases/(default)/documents/contact_submissions/${id}`;
}

export async function saveContact(entry) {
  const id = randomUUID();
  const path = await firestoreURL(id);
  const response = await fetch(path, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${await cloudToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: {
      name: field(entry.name), email: field(entry.email), company: field(entry.company),
      inquiry: field(entry.inquiry), sourceHost: field(entry.sourceHost),
      submittedAt: { timestampValue: new Date().toISOString() },
      notificationStatus: field('pending'),
    } }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Firestore write failed (${response.status})`);
  return id;
}

export async function markContactNotified(id, emailId) {
  const path = await firestoreURL(id);
  const response = await fetch(`${path}?updateMask.fieldPaths=notificationStatus&updateMask.fieldPaths=notificationId`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${await cloudToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { notificationStatus: field('accepted'), notificationId: field(emailId) } }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Firestore notification update failed (${response.status})`);
}

export async function notifyContact(entry, id) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `decisionaxis-contact-${id}`,
    },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM_EMAIL,
      to: [recipient],
      subject: 'New Decision Axis website inquiry',
      text: `Name: ${entry.name}\nCompany: ${entry.company}\nEmail: ${entry.email}\nSource: ${entry.sourceHost}\n\nInquiry:\n${entry.inquiry}\n\nReference: ${id}`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Notification request failed (${response.status})`);
  const data = await response.json();
  if (!data.id) throw new Error('Notification response had no ID');
  return data.id;
}

export function createContactHandler({ save = saveContact, notify = notifyContact, markNotified = markContactNotified, configured = () => Boolean(process.env.RESEND_API_KEY && process.env.CONTACT_FROM_EMAIL) } = {}) {
  return async function contactHandler(req, res) {
    if (req.method !== 'POST') return reply(req, res, 405, { error: 'Use POST.' });
    if (!allowedOrigins.has(req.headers.origin)) return reply(req, res, 403, { error: 'Invalid origin.' });
    if (!(req.headers['content-type'] || '').startsWith('application/x-www-form-urlencoded')) return reply(req, res, 415, { error: 'Unsupported form format.' });
    try {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 12000) return reply(req, res, 413, { error: 'Inquiry is too long.' });
      }
      const params = new URLSearchParams(body);
      if (params.get('website')) return reply(req, res, 200, { saved: true, notified: true, message: 'Thanks — your inquiry has been received.' });
      const entry = {
        name: clean(params.get('name'), 120), company: clean(params.get('company'), 160),
        email: clean(params.get('email'), 254), inquiry: clean(params.get('inquiry'), 5000),
        sourceHost: clean((req.headers.host || '').split(':')[0], 255),
      };
      if (!entry.name || entry.name.length > 120 || !entry.company || entry.company.length > 160 || !entry.email || entry.email.length > 254 || !emailValid(entry.email) || !entry.inquiry || entry.inquiry.length > 5000) {
        return reply(req, res, 400, { error: 'Please complete all fields with a valid email address.' });
      }
      const caller = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      for (const [key, value] of attempts) if (now - value.start > 3600000) attempts.delete(key);
      const bucket = attempts.get(caller) || { start: now, count: 0 };
      if (bucket.count >= 5) return reply(req, res, 429, { error: 'Please try again later.' });
      bucket.count++;
      attempts.set(caller, bucket);
      let id;
      try { id = await save(entry); }
      catch (error) { console.error('Contact storage failed', error.message); return reply(req, res, 503, { error: 'The contact form is temporarily unavailable.' }); }
      if (!configured()) return reply(req, res, 200, { saved: true, notified: false, message: 'Thanks — your inquiry has been received.' });
      try {
        const emailId = await notify(entry, id);
        try { await markNotified(id, emailId); }
        catch (error) { console.error('Contact notification status update failed', error.message); }
        return reply(req, res, 200, { saved: true, notified: true, message: 'Thanks — your inquiry has been received.' });
      } catch (error) {
        console.error('Contact notification failed', error.message);
        return reply(req, res, 202, { saved: true, notified: false, message: 'Thanks — your inquiry has been received.' });
      }
    } catch (error) {
      console.error('Contact request failed', error.message);
      return reply(req, res, 400, { error: 'Could not read your inquiry. Please try again.' });
    }
  };
}
