// Voice onboarding page: Gemini 3.8 Live interviews the person; every answer
// arrives as an update_profile tool call and fills the panel on the right.
import { MODEL, TOOLS, QUESTIONS, LABELS, FIELD_QUESTION, systemPrompt, score } from './interview.js';
import { match } from './companies.js';

const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const FIELDS = [
  ['currently_invests', 'Invests in stocks'],
  ['instruments', 'How you invest'],
  ['cap_tilt', 'Market caps'],
  ['fno_frequency', 'F&O or intraday'],
  ['fno_outcome', 'F&O results'],
  ['companies', 'Companies'],
  ['interests', 'Interests'],
  ['interest_reasons', 'Why'],
  ['risk_appetite', 'Risk appetite'],
  ['drawdown_reaction', 'If markets fall 20%'],
  ['will_do', 'Would always'],
  ['avoid', 'Would never'],
  ['horizon', 'Time horizon'],
  ['emergency_cushion', 'Savings cushion'],
];
const LISTS = new Set(['instruments', 'companies', 'interests', 'will_do', 'avoid']);

const state = { profile: {}, quotes: {}, question: 0, fresh: new Set(), status: 'idle', done: false };
let live = null, newTurn = true, userLine = '', endAfterTurn = false;

// ---------- Live connection ----------
class Live {
  constructor(hooks) { this.h = hooks; this.sources = new Set(); this.next = 0; this.closed = false; this.ready = false; }
  send(v) { if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(v)); }
  async connect() {
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioWorkletNode) throw Error('This browser cannot record audio. Try a recent Chrome, Edge or Safari.');
    try { this.media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch { throw Error('I need your microphone to interview you. Allow it in your browser, then start again.'); }
    const r = await fetch('/api/onboarding/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: MODEL }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.token) throw Error(data.error || 'Could not start the interview.');
    this.ctx = new AudioContext(); await this.ctx.resume();
    await this.ctx.audioWorklet.addModule('/onboarding/live-capture.js');
    this.out = this.ctx.createGain(); this.outLevel = this.ctx.createAnalyser(); this.outLevel.fftSize = 1024;
    this.out.connect(this.outLevel); this.out.connect(this.ctx.destination);
    this.src = this.ctx.createMediaStreamSource(this.media);
    this.micLevel = this.ctx.createAnalyser(); this.micLevel.fftSize = 1024; this.src.connect(this.micLevel);
    this.capture = new AudioWorkletNode(this.ctx, 'live-capture'); this.src.connect(this.capture);
    const silent = this.ctx.createGain(); silent.gain.value = 0; this.capture.connect(silent).connect(this.ctx.destination);
    this.capture.port.onmessage = e => {
      if (!this.ready) return;
      const bytes = new Uint8Array(e.data); let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      this.send({ realtimeInput: { audio: { data: btoa(bin), mimeType: 'audio/pcm;rate=16000' } } });
    };
    this.ws = new WebSocket('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=' + encodeURIComponent(data.token));
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('Gemini took too long to connect. Please try again.')), 25000);
      this.ws.onopen = () => this.send({ setup: {
        model: 'models/' + MODEL,
        generationConfig: { responseModalities: ['AUDIO'] },
        systemInstruction: { parts: [{ text: systemPrompt() }] },
        inputAudioTranscription: {}, outputAudioTranscription: {},
        tools: [{ functionDeclarations: TOOLS }],
      } });
      this.ws.onmessage = async e => {
        let m; try { m = JSON.parse(typeof e.data === 'string' ? e.data : await e.data.text()); } catch { return; }
        if (m.setupComplete) {
          clearTimeout(timer); this.ready = true; resolve();
          this.send({ clientContent: { turns: [{ role: 'user', parts: [{ text: 'Hi, I am ready to start.' }] }], turnComplete: true } });
          return;
        }
        if (m.error) { clearTimeout(timer); reject(Error(m.error.message || 'Gemini error')); return; }
        this.onMessage(m);
      };
      this.ws.onerror = () => { clearTimeout(timer); reject(Error('Could not reach Gemini. Please try again.')); };
      this.ws.onclose = ev => {
        clearTimeout(timer);
        if (this.closed) return;
        // Billing and quota failures arrive as a close reason; say so plainly instead of "connection closed".
        if (ev.reason) console.warn('Gemini closed the session:', ev.code, ev.reason);
        const unavailable = /credit|quota|billing|exhausted/i.test(ev.reason || '');
        reject(Error(unavailable ? 'Voice interviews are unavailable right now. Please try again later.' : 'The connection closed. Please try again.'));
        this.h.closed(unavailable);
      };
    });
  }
  onMessage(m) {
    const sc = m.serverContent;
    if (sc?.interrupted) { this.stopAudio(); this.h.status('listening'); }
    if (sc?.inputTranscription?.text) this.h.heard(sc.inputTranscription.text);
    if (sc?.outputTranscription?.text) this.h.said(sc.outputTranscription.text);
    for (const part of sc?.modelTurn?.parts || []) {
      if (part.inlineData?.data) this.play(part.inlineData.data, Number(/rate=(\d+)/.exec(part.inlineData.mimeType || '')?.[1]) || 24000);
    }
    if (sc?.turnComplete) this.h.turnDone();
    for (const call of m.toolCall?.functionCalls || []) {
      let output;
      try { output = this.h.tool(call.name, call.args || {}); } catch (err) { output = { error: String(err?.message || err) }; }
      this.send({ toolResponse: { functionResponses: [{ id: call.id, name: call.name, response: { output } }] } });
    }
  }
  play(b64, rate) {
    if (!this.ctx) return;
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const pcm = new Int16Array(bytes.buffer, 0, bytes.length >> 1);
    const buffer = this.ctx.createBuffer(1, pcm.length, rate);
    buffer.getChannelData(0).set(Float32Array.from(pcm, n => n / 32768));
    const source = this.ctx.createBufferSource(); source.buffer = buffer; source.connect(this.out);
    const start = Math.max(this.ctx.currentTime, this.next); this.next = start + buffer.duration;
    if (!this.sources.size) this.h.status('speaking');
    this.sources.add(source);
    source.onended = () => { this.sources.delete(source); if (!this.sources.size) this.h.drained(); };
    source.start(start);
  }
  stopAudio() { for (const s of this.sources) { try { s.stop(); } catch {} } this.sources.clear(); this.next = this.ctx?.currentTime || 0; }
  level(which) {
    const a = which === 'out' ? this.outLevel : this.micLevel; if (!a) return 0;
    const buf = new Uint8Array(a.fftSize); a.getByteTimeDomainData(buf);
    let sum = 0; for (const v of buf) { const x = (v - 128) / 128; sum += x * x; }
    return Math.sqrt(sum / buf.length);
  }
  close() {
    this.closed = true; this.ready = false; this.stopAudio();
    try { this.capture?.disconnect(); this.src?.disconnect(); } catch {}
    this.media?.getTracks().forEach(t => t.stop());
    try { this.ws?.close(); } catch {}
    this.ctx?.close().catch(() => {});
  }
}

// ---------- Profile updates from the interviewer ----------
function addItems(field, items) {
  const list = state.profile[field] ||= [];
  for (const raw of items || []) {
    if (!raw || typeof raw !== 'string') continue;
    let item = { label: raw.trim() };
    if (field === 'companies' || field === 'avoid') {
      const m = match(raw);
      if (m?.matched) item = { label: m.name, symbol: m.symbol, sector: m.sector, heard: raw };
    } else if (LABELS[field]?.[raw]) item = { label: LABELS[field][raw], value: raw };
    if (!list.some(x => x.label.toLowerCase() === item.label.toLowerCase())) list.push(item);
  }
}

function onTool(name, args) {
  if (name === 'update_profile') {
    const changed = [];
    for (const [key, value] of Object.entries(args)) {
      if (key === 'quote') continue;
      if (LISTS.has(key)) addItems(key, Array.isArray(value) ? value : [value]);
      else if (typeof value === 'string' && value.trim()) state.profile[key] = value.trim();
      else continue;
      changed.push(key);
    }
    if (args.quote && changed.length) for (const k of changed) state.quotes[k] = String(args.quote).slice(0, 160);
    state.fresh = new Set(changed);
    for (const k of changed) state.question = Math.max(state.question, FIELD_QUESTION[k] || 0);
    render();
    const companies = (state.profile.companies || []).filter(c => c.symbol).map(c => `${c.label} (${c.symbol})`);
    return { saved: changed, companies_on_record: companies };
  }
  if (name === 'finish_interview') {
    state.done = true; endAfterTurn = true;
    if (args.summary) state.summary = String(args.summary);
    render();
    return { ok: true };
  }
  return { error: 'Unknown tool' };
}

// ---------- Rendering ----------
function valueHTML(key) {
  const v = state.profile[key];
  if (LISTS.has(key)) {
    if (!v?.length) return null;
    return `<div class="chips">${v.map((item, i) => `<span class="chip">${esc(item.label)}${item.symbol ? ` <small>${esc(item.symbol)}</small>` : ''}<button type="button" data-field="${key}" data-index="${i}" aria-label="Remove ${esc(item.label)}">×</button></span>`).join('')}</div>`;
  }
  if (!v) return null;
  return esc(LABELS[key]?.[v] || v);
}

function render() {
  $('fields').innerHTML = FIELDS.map(([key, label]) => {
    const html = valueHTML(key);
    const quote = html && state.quotes[key] ? `<span class="quote">“${esc(state.quotes[key])}”</span>` : '';
    return `<div class="row${state.fresh.has(key) ? ' fresh' : ''}" data-key="${key}"><dt>${esc(label)}</dt><dd class="${html ? '' : 'empty'}">${html ?? 'Not yet'}${quote}</dd></div>`;
  }).join('');
  setTimeout(() => document.querySelectorAll('.row.fresh').forEach(r => r.classList.remove('fresh')), 1600);

  const s = score(state.profile);
  $('profile').innerHTML = s.band ? `<p class="hint">Risk profile so far</p><p class="band">${esc(s.band)}</p>
    <div class="meter">Willingness<span><i style="width:${(s.willingness / 4) * 100}%"></i></span></div>
    <div class="meter">Capacity<span><i style="width:${(s.capacity / 4) * 100}%"></i></span></div>
    <p class="note">The lower of the two sets the profile. A preference profile, not investment advice.</p>` : '';

  $('dots').innerHTML = QUESTIONS.map(q => `<li class="${q.id <= state.question ? 'on' : ''}"></li>`).join('');
  $('step').textContent = state.done ? 'Interview complete' : state.question ? `Question ${state.question} of ${QUESTIONS.length}` : state.status === 'idle' ? 'Ready when you are' : 'Starting';
  if (state.done && state.summary) { $('said').textContent = state.summary; $('bubble').classList.add('done'); }
}

$('fields').addEventListener('click', e => {
  const b = e.target.closest('button[data-field]'); if (!b) return;
  state.profile[b.dataset.field]?.splice(Number(b.dataset.index), 1);
  render();
});

function setStatus(s) {
  state.status = s;
  $('state').textContent = { connecting: 'Connecting…', listening: 'Listening', speaking: 'Speaking', ended: '', idle: '' }[s] ?? '';
}

async function start() {
  if (live) return;
  Object.assign(state, { profile: {}, quotes: {}, question: 0, fresh: new Set(), done: false, summary: '' });
  newTurn = true; userLine = ''; endAfterTurn = false;
  $('bubble').classList.remove('done'); $('heard').textContent = '';
  $('said').textContent = 'Connecting…';
  $('start').disabled = true; setStatus('connecting'); render();
  live = new Live({
    status: setStatus,
    said: text => { if (newTurn) { $('said').textContent = ''; newTurn = false; userLine = ''; } $('said').textContent += text; },
    heard: text => { newTurn = true; userLine += text; $('heard').innerHTML = `<b>You:</b> ${esc(userLine.trim())}`; setStatus('listening'); },
    turnDone: () => { newTurn = true; },
    drained: () => { if (endAfterTurn) stop(); else setStatus('listening'); },
    tool: onTool,
    closed: unavailable => { if (!state.done) $('said').textContent = unavailable ? 'Voice interviews are unavailable right now. Please try again later.' : 'The connection dropped. Start again to continue.'; stop(); },
  });
  try {
    await live.connect();
    $('start').hidden = true; $('stop').hidden = false; $('start').disabled = false;
  } catch (err) {
    live?.close(); live = null;
    $('said').textContent = err.message; setStatus('idle');
    $('start').disabled = false; $('start').textContent = 'Try again';
  }
}

function stop() {
  live?.close(); live = null;
  $('stop').hidden = true; $('start').hidden = false; $('start').disabled = false;
  $('start').textContent = state.done ? 'Start again' : 'Start interview';
  setStatus('ended'); render();
}

$('start').addEventListener('click', start);
$('stop').addEventListener('click', stop);

// ---------- Waveform ----------
const canvas = $('wave'), g = canvas.getContext('2d');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
let level = 0, t = 0;
function draw() {
  const w = canvas.clientWidth, h = canvas.clientHeight, dpr = devicePixelRatio || 1;
  if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  const speaking = state.status === 'speaking', listening = state.status === 'listening';
  const target = live ? Math.min(1, (speaking ? live.level('out') : listening ? live.level('mic') : 0) * 5) : 0;
  level += (target - level) * 0.18; t += still ? 0 : 0.045;
  const color = speaking ? '#204dff' : listening ? '#111318' : '#c9ccd3';
  const lines = [[1, 1.6, 0], [0.55, 2.3, 1.7], [0.35, 3.1, 3.3]];
  for (const [amp, freq, phase] of lines) {
    g.beginPath();
    for (let x = 0; x <= w; x += 3) {
      const edge = Math.sin(Math.PI * x / w);
      const a = (h * 0.06 + level * h * 0.42) * amp * edge;
      const y = h / 2 + Math.sin((x / w) * Math.PI * 2 * freq + t * (1 + amp) + phase) * a;
      x ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.strokeStyle = color; g.globalAlpha = amp === 1 ? 1 : 0.45; g.lineWidth = amp === 1 ? 2 : 1.2; g.stroke();
  }
  g.globalAlpha = 1;
  requestAnimationFrame(draw);
}
render();
requestAnimationFrame(draw);

export { onTool };
