import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
const project = 'striking-loop-447915-q3', bucket = 'decisionaxis-feedback-striking-loop-447915-q3';
const root = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/feedback_studies`;
const id = () => randomBytes(18).toString('base64url');
const hash = value => createHash('sha256').update(String(value)).digest('hex');
const error = (message, status = 400) => Object.assign(new Error(message), { status });
const validId = value => /^[a-zA-Z0-9_-]{24}$/.test(value || '');
const json = (res, status, value) => res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' }).end(JSON.stringify(value));
export function checkedTarget(value) {
  let url; try { url = new URL(value); } catch { throw error('Enter a complete HTTPS target URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || value.length > 2000 || !url.hostname.includes('.') || /^(?:localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(url.hostname)) throw error('Use a public HTTPS URL without embedded credentials.');
  return url.href;
}
export function evidenceReport(entries = []) {
  return entries.filter(item => item.type === 'transcript' || item.type === 'comment').map(item => ({
    at: item.at, text: item.text, source: item.type === 'transcript' ? 'Google Speech-to-Text (check against recording)' : 'Participant typed comment',
    category: item.category === 'liked' || item.category === 'friction' ? item.category : /\b(i like|i love|easy to|helpful|looks good)\b/i.test(item.text) ? 'liked' : /\b(confus|can.t find|hard to|doesn.t work|difficult|stuck|frustrat)/i.test(item.text) ? 'friction' : 'comment',
  }));
}
async function body(req, limit = 16000, raw = false) {
  const chunks = []; let count = 0; for await (const chunk of req) { const bytes = Buffer.from(chunk); count += bytes.length; if (count > limit) throw error('Upload too large.', 413); chunks.push(bytes); }
  const value = Buffer.concat(chunks); if (raw) return value;
  try { return JSON.parse(value.toString()); } catch { throw error('Invalid JSON.'); }
}
function matches(value, stored) { const a = Buffer.from(hash(value)), b = Buffer.from(stored || ''); return a.length === b.length && timingSafeEqual(a, b); }
export function createFeedbackHandler(cloudToken) {
  async function cloud(url, options = {}) {
    const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${await cloudToken()}`, ...options.headers }, signal: AbortSignal.timeout(55000) });
    if (!response.ok) throw error(`Feedback storage/provider request failed (${response.status}).`, response.status === 412 ? 409 : 502);
    return response;
  }
  async function document(path, data, version) {
    const response = await fetch(`${root}/${path}${version ? `?currentDocument.updateTime=${encodeURIComponent(version)}` : ''}`, {
      method: data ? 'PATCH' : 'GET', headers: { Authorization: `Bearer ${await cloudToken()}`, 'Content-Type': 'application/json' },
      ...(data ? { body: JSON.stringify({ fields: { data: { stringValue: JSON.stringify(data) }, expireAt: { timestampValue: data.expiresAt } } }) } : {}), signal: AbortSignal.timeout(10000) });
    if (response.status === 404) return null;
    if (!response.ok) throw error(`Feedback data store unavailable (${response.status}).`, response.status === 412 ? 409 : 503);
    const result = await response.json(); return { ...JSON.parse(result.fields.data.stringValue), version: result.updateTime };
  }
  async function save(path, data) { const { version, ...fields } = data; return document(path, fields, version); }
  async function study(studyId) {
    if (!validId(studyId)) throw error('Study not found.', 404); const value = await document(studyId);
    if (!value || value.disabled || Date.parse(value.expiresAt) <= Date.now()) throw error('This study link has expired or been disabled.', 410); return value;
  }
  async function participant(req, studyId, sessionId) {
    const currentStudy = await study(studyId); if (!validId(sessionId)) throw error('Session not found.', 404);
    const current = await document(`${studyId}/feedback_sessions/${sessionId}`), token = String(req.headers.authorization || '').replace(/^Bearer /, '');
    if (!current || !matches(token, current.tokenHash)) throw error('This participant session is not authorized.', 403);
    if (current.status !== 'recording') throw error('This session has ended.', 409);
    if (Date.now() - Date.parse(current.startedAt) > 10 * 60000) throw error('Session recording time expired.', 410);
    return { currentStudy, current };
  }
  const publicStudy = value => ({ title: value.title, target: value.target, task: value.task, expiresAt: value.expiresAt, maxMinutes: 6 });
  return async function feedback(req, res, path, config, uid) {
    const url = new URL(req.url, config.origin);
    const origin = () => { if (req.headers.origin !== config.origin) throw error('Invalid request origin.', 403); };
    const owner = () => { if (!uid) throw error('Sign in with Google to manage your studies.', 401); };
    try {
      if (path === '/config' && req.method === 'GET') return json(res, 200, { configured: true, signedIn: !!uid, transcription: 'Google Cloud Speech-to-Text, approximately 20-second chunks', faceCues: 'MediaPipe on-device estimates, not emotions' });
      if (path === '/studies' && req.method === 'GET') {
        owner(); const response = await cloud(`${root}?pageSize=100`), result = await response.json();
        const studies = (result.documents || []).map(doc => ({ id: doc.name.split('/').at(-1), ...JSON.parse(doc.fields.data.stringValue) })).filter(item => item.owner === uid && !item.disabled && Date.parse(item.expiresAt) > Date.now());
        return json(res, 200, { studies: studies.map(item => ({ id: item.id, ...publicStudy(item), sessionCount: item.sessionCount })) });
      }
      if (path === '/create' && req.method === 'POST') {
        origin(); owner(); const input = await body(req); const target = checkedTarget(input.target);
        if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 120 || typeof input.task !== 'string' || !input.task.trim() || input.task.length > 2000) throw error('Add a study title and a short task for the participant.');
        const studyId = id(), invite = id(), expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
        await document(studyId, { owner: uid, title: input.title.trim(), task: input.task.trim(), target, inviteHash: hash(invite), createdAt: new Date().toISOString(), expiresAt, sessionCount: 0, disabled: false });
        return json(res, 200, { id: studyId, participantUrl: `${config.origin}/feedback/?study=${studyId}&invite=${invite}`, expiresAt });
      }
      if (path === '/study' && req.method === 'GET') {
        const current = await study(url.searchParams.get('study'));
        if (!matches(url.searchParams.get('invite'), current.inviteHash)) throw error('This study link is not authorized.', 403);
        return json(res, 200, publicStudy(current));
      }
      if (path === '/join' && req.method === 'POST') {
        origin(); const input = await body(req), currentStudy = await study(input.study);
        if (!matches(input.invite, currentStudy.inviteHash)) throw error('This study link is not authorized.', 403);
        if (currentStudy.sessionCount >= 10) throw error('This pilot study has reached its 10-session limit.', 429);
        if (input.consent !== true || typeof input.microphone !== 'boolean' || typeof input.screen !== 'boolean' || typeof input.camera !== 'boolean' || typeof input.faceCues !== 'boolean' || input.faceCues && !input.camera) throw error('Review and explicitly consent to the selected capture modes.');
        await save(input.study, { ...currentStudy, sessionCount: currentStudy.sessionCount + 1 });
        const sessionId = id(), token = id();
        await document(`${input.study}/feedback_sessions/${sessionId}`, { tokenHash: hash(token), startedAt: new Date().toISOString(), expiresAt: currentStudy.expiresAt,
          status: 'recording', consent: { microphone: input.microphone, screen: input.screen, camera: input.camera, faceCues: input.faceCues }, entries: [], media: [], bytes: 0, chunks: 0 });
        return json(res, 200, { sessionId, token });
      }
      if (path === '/event' && req.method === 'POST') {
        origin(); const input = await body(req); const { current } = await participant(req, input.study, input.sessionId);
        if (current.entries.length >= 300 || !Number.isFinite(input.at) || input.at < 0 || input.at > 365) throw error('Event limit reached or invalid timestamp.');
        let entry;
        if (input.type === 'comment' && typeof input.text === 'string' && input.text.trim() && input.text.length <= 2000)
          entry = { type: 'comment', at: input.at, text: input.text.trim(), category: ['liked', 'friction'].includes(input.category) ? input.category : 'comment' };
        else if (input.type === 'context' && typeof input.text === 'string' && input.text.length <= 2000) entry = { type: 'context', at: input.at, text: input.text };
        else if (input.type === 'face_cues' && current.consent.faceCues) {
          const cues = Object.fromEntries(Object.entries(input.cues || {}).filter(([name, score]) => ['jawOpen', 'mouthSmileLeft', 'mouthSmileRight', 'browInnerUp', 'eyeBlinkLeft', 'eyeBlinkRight'].includes(name) && Number.isFinite(score) && score >= 0 && score <= 1));
          if (!Object.keys(cues).length) throw error('No valid observable cues.'); entry = { type: 'face_cues', at: input.at, cues, interpretation: 'Approximate visible-movement estimates, not internal feelings.' };
        } else throw error('Invalid feedback event.');
        await save(`${input.study}/feedback_sessions/${input.sessionId}`, { ...current, entries: [...current.entries, entry] }); return json(res, 200, { saved: true });
      }
      if (path === '/chunk' && req.method === 'POST') {
        origin(); const studyId = url.searchParams.get('study'), sessionId = url.searchParams.get('session'); const { current } = await participant(req, studyId, sessionId);
        const kind = url.searchParams.get('kind'), at = Number(url.searchParams.get('at'));
        if (!['audio', 'screen', 'camera'].includes(kind) || !current.consent[kind === 'audio' ? 'microphone' : kind] || !Number.isFinite(at) || at < 0 || at > 365 || current.chunks >= 80 || current.bytes >= 100 * 1024 * 1024) throw error('Capture mode not consented, invalid time, or recording limit reached.', 403);
        const bytes = await body(req, 6 * 1024 * 1024, true); if (!bytes.length || current.bytes + bytes.length > 100 * 1024 * 1024) throw error('Recording limit exceeded.', 413);
        const name = `${studyId}/${sessionId}/${kind}-${String(current.chunks).padStart(3, '0')}.webm`;
        await cloud(`https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&ifGenerationMatch=0&name=${encodeURIComponent(name)}`, { method: 'POST', headers: { 'Content-Type': kind === 'audio' ? 'audio/webm' : 'video/webm' }, body: bytes });
        let updated = await save(`${studyId}/feedback_sessions/${sessionId}`, { ...current, chunks: current.chunks + 1, bytes: current.bytes + bytes.length, media: [...current.media, { kind, name, at, bytes: bytes.length }] });
        const entries = []; let transcriptionError = '';
        if (kind === 'audio') {
          try {
            const recognition = await cloud('https://speech.googleapis.com/v1/speech:recognize', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-user-project': project },
              body: JSON.stringify({ config: { encoding: 'WEBM_OPUS', sampleRateHertz: 48000, languageCode: 'en-US', enableAutomaticPunctuation: true, enableWordTimeOffsets: true, model: 'latest_short' }, audio: { content: bytes.toString('base64') } }) });
            const result = await recognition.json();
            for (const item of result.results || []) { const best = item.alternatives?.[0]; if (best?.transcript) entries.push({ type: 'transcript', at: at + parseFloat(best.words?.[0]?.startTime || '0'), text: best.transcript.slice(0, 3000), confidence: best.confidence ?? null }); }
            if (entries.length) updated = await save(`${studyId}/feedback_sessions/${sessionId}`, { ...updated, entries: [...updated.entries, ...entries] });
          } catch (failure) { transcriptionError = `${failure.message} Recording retained; no transcript was invented.`; }
        }
        return json(res, 200, { saved: true, entries, transcriptionError });
      }
      if (path === '/finish' && req.method === 'POST') {
        origin(); const input = await body(req); const { current } = await participant(req, input.study, input.sessionId);
        const report = evidenceReport(current.entries);
        await save(`${input.study}/feedback_sessions/${input.sessionId}`, { ...current, status: 'finished', finishedAt: new Date().toISOString(), report });
        return json(res, 200, { finished: true, report, message: 'Capture stopped. Your feedback is available only to the study owner.' });
      }
      if (path === '/report' && req.method === 'GET') {
        owner(); const studyId = url.searchParams.get('study'), current = await study(studyId); if (current.owner !== uid) throw error('This study belongs to another owner.', 403);
        const result = await (await cloud(`${root}/${studyId}/feedback_sessions?pageSize=10`)).json();
        const sessions = (result.documents || []).map(doc => { const data = JSON.parse(doc.fields.data.stringValue); return { id: doc.name.split('/').at(-1), startedAt: data.startedAt, status: data.status, consent: data.consent, entries: data.entries, report: evidenceReport(data.entries), mediaKinds: [...new Set(data.media.map(item => item.kind))], audioClips: data.media.filter(item => item.kind === 'audio').map((item, index) => ({ at: item.at, index })) }; });
        return json(res, 200, { study: publicStudy(current), sessions });
      }
      if (path === '/media' && req.method === 'GET') {
        owner(); const studyId = url.searchParams.get('study'), currentStudy = await study(studyId); if (currentStudy.owner !== uid) throw error('This study belongs to another owner.', 403);
        const sessionId = url.searchParams.get('session'), kind = url.searchParams.get('kind'); if (!validId(sessionId) || !['audio', 'screen', 'camera'].includes(kind)) throw error('Invalid recording.');
        const current = await document(`${studyId}/feedback_sessions/${sessionId}`); let chunks = (current?.media || []).filter(item => item.kind === kind);
        if (kind === 'audio') { const part = Number(url.searchParams.get('part')); if (!url.searchParams.has('part') || !Number.isInteger(part) || part < 0 || part >= chunks.length) throw error('Choose an individual audio clip.'); chunks = [chunks[part]]; }
        if (!chunks.length) throw error('No recording for this mode.', 404);
        res.writeHead(200, { 'Content-Type': kind === 'audio' ? 'audio/webm' : 'video/webm', 'Cache-Control': 'no-store', 'Content-Disposition': `inline; filename="${kind}.webm"`, 'X-Content-Type-Options': 'nosniff' });
        for (const chunk of chunks) { const response = await cloud(`https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(chunk.name)}?alt=media`); for await (const bytes of response.body) { if (!res.write(bytes)) await new Promise(resolve => res.once('drain', resolve)); } }
        res.end(); return;
      }
      if (path === '/disable' && req.method === 'POST') {
        origin(); owner(); const input = await body(req), current = await study(input.study); if (current.owner !== uid) throw error('This study belongs to another owner.', 403);
        await save(input.study, { ...current, disabled: true }); return json(res, 200, { disabled: true });
      }
      throw error('Not found.', 404);
    } catch (failure) { if (!res.headersSent) return json(res, failure.status || 503, { error: failure.message }); res.end(); }
  };
}
