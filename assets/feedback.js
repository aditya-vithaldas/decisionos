const $ = id => document.getElementById(id), params = new URLSearchParams(location.search);
let studyId = params.get('study'), invite = params.get('invite'), sessionId, token, started, active = false, stopping = false, queue = Promise.resolve(), reportStudy;
let screenStream, micStream, cameraStream, faceDetector, tick, faceTick, audioTick, captureError = false;
const recorders = [], streams = [], entries = [];
const status = text => { $('status').textContent = text; };
const seconds = () => Math.min(360, (performance.now() - started) / 1000);
const stamp = seconds => `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(Math.floor(seconds % 60)).padStart(2,'0')}`;
async function api(path, body, authorization = token) {
  const response = await fetch(`/crm/api/feedback${path}`, { ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}) } }) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Please try again.'); return data;
}
function serialized(action) { const result = queue.then(action); queue = result.catch(error => { captureError = true; status(`Capture/save error: ${error.message} Stop and retry saving; do not assume this part was saved.`); }); return result; }
async function action(button, work) { button.disabled = true; try { await work(); } catch (error) { status(error.message); } finally { button.disabled = false; } }
function line(text, target = 'live-transcript') { const li = document.createElement('li'); li.textContent = text; $(target).append(li); }
async function loadStudies() {
  const result = await api('/studies'); $('study-list').replaceChildren();
  for (const study of result.studies) { const card = document.createElement('div'); card.className = 'study-card'; const title = document.createElement('h3'); title.textContent = study.title; const text = document.createElement('p'); text.textContent = `${study.target} · ${study.sessionCount} sessions · expires ${new Date(study.expiresAt).toLocaleDateString()}`; const button = document.createElement('button'); button.textContent = 'View private report'; button.addEventListener('click', () => action(button, () => showReport(study.id))); card.append(title, text, button); $('study-list').append(card); }
  if (!result.studies.length) $('study-list').textContent = 'No studies yet. Create a task and share its participant link.';
}
async function showReport(id) {
  reportStudy = id; const result = await api(`/report?study=${id}`); $('owner-report').hidden = false; $('report-title').textContent = result.study.title; $('report-sessions').replaceChildren();
  for (const session of result.sessions) { const block = document.createElement('section'); block.className = 'study-card'; const title = document.createElement('h3'); title.textContent = `Session ${new Date(session.startedAt).toLocaleString()} · ${session.status}`; block.append(title);
    for (const entry of session.report) { const p = document.createElement('p'); p.className = 'report-entry'; p.textContent = `${stamp(entry.at)} · ${entry.category.toUpperCase()} — ${entry.text}`; const small = document.createElement('small'); small.textContent = entry.source; p.append(small); block.append(p); }
    if (!session.report.length) { const p = document.createElement('p'); p.textContent = 'No spoken/typed feedback saved yet.'; block.append(p); }
    for (const event of session.entries.filter(item => item.type === 'context' || item.type === 'face_cues')) { const p = document.createElement('p'); p.className = 'report-entry'; p.textContent = `${stamp(event.at)} · ${event.type === 'context' ? 'PARTICIPANT/PLAYER CONTEXT — ' + event.text : 'OBSERVABLE CUE ESTIMATES — ' + Object.entries(event.cues).map(([key,value]) => `${key} ${value.toFixed(2)}`).join(', ') + '. Not emotions.'}`; block.append(p); }
    for (const kind of session.mediaKinds.filter(kind=>kind!=='audio')) { const link = document.createElement('a'); link.textContent = `Open private ${kind} recording ↗`; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.className = 'recording'; link.href = `/crm/api/feedback/media?study=${id}&session=${session.id}&kind=${kind}`; block.append(link); }
    for (const clip of session.audioClips || []) { const audio = document.createElement('audio'); audio.controls = true; audio.preload = 'none'; audio.className = 'recording'; audio.setAttribute('aria-label',`Audio clip at ${stamp(clip.at)}`); audio.src = `/crm/api/feedback/media?study=${id}&session=${session.id}&kind=audio&part=${clip.index}`; const label = document.createElement('p'); label.textContent = `Microphone clip ${stamp(clip.at)}`; block.append(label,audio); }
    $('report-sessions').append(block);
  }
  status(`${result.sessions.length} participant sessions. Reports and recordings require your owner login.`);
}
$('refresh-report').addEventListener('click', event => action(event.currentTarget, () => showReport(reportStudy)));
$('study-form').addEventListener('submit', event => { event.preventDefault(); action($('create-study'), async () => { const result = await api('/create', { title: $('study-title').value, target: $('target-url').value, task: $('study-task').value }); $('share-url').value = result.participantUrl; $('share-block').hidden = false; status('Private study created. Share its link with your intended participants.'); await loadStudies(); }); });
$('copy-link').addEventListener('click', event => action(event.currentTarget, async () => { await navigator.clipboard.writeText($('share-url').value); status('Participant link copied.'); }));
$('preview-target').addEventListener('click', event => { const frame = $('target-frame'); frame.src = $('open-target').href; frame.hidden = false; event.currentTarget.disabled = true; status('Preview requested. If the site blocks embedding or looks blank, use the normal-tab link and explicitly share that tab.'); });
$('target-frame').addEventListener('load', () => { if (!active) return; let text = 'Embedded frame emitted a load event; this does not prove cross-origin content loaded successfully.'; try { const href = $('target-frame').contentWindow.location.href; if (new URL(href).origin === location.origin) text = `Same-site preview navigation: ${href}`; } catch {} serialized(() => api('/event', { study: studyId, sessionId, type: 'context', at: seconds(), text })).catch(() => {}); });
$('choose-screen').addEventListener('click', event => action(event.currentTarget, async () => {
  if (!$('consent').checked || !$('use-screen').checked) throw new Error('Consent and select screen capture before opening the browser picker.');
  if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('This browser cannot share a screen. Use supported desktop Chrome, or leave screen capture off.');
  screenStream?.getTracks().forEach(track => track.stop()); screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 8, max: 12 } }, audio: false }); streams.push(screenStream);
  $('screen-state').textContent = 'Screen selected. No recording until you press Start.'; screenStream.getVideoTracks()[0].addEventListener('ended', () => { $('screen-state').textContent = 'Screen sharing stopped.'; if (active) stopSession(); });
}));
async function prepareFace() {
  if (faceDetector) return;
  try { const { FaceLandmarker, FilesetResolver } = await import('/assets/feedback-vision/vision_bundle.mjs'); const files = await FilesetResolver.forVisionTasks('/assets/feedback-vision/wasm'); faceDetector = await FaceLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: '/assets/feedback-vision/face_landmarker.task' }, runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true }); $('face-state').textContent = 'Face-movement detector ready. Estimates do not reveal feelings.'; }
  catch (error) { $('face-state').textContent = `Face detector unavailable: ${error.message}. No cue readings will be invented.`; }
}
$('check-face').addEventListener('click',event=>action(event.currentTarget,async()=>{ status('Checking local face-cue support. No camera is being opened.'); await prepareFace(); status($('face-state').textContent); }));
function videoRecorder(stream, kind) {
  const mime = ['video/webm;codecs=vp8', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type)); if (!mime) throw new Error('This browser cannot record WebM video. Leave camera/screen capture off or use Chrome.');
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 700000 }); let at = seconds();
  recorder.ondataavailable = event => { const startAt = at; at = seconds(); if (event.data.size) upload(event.data, kind, startAt); }; recorder.start(20000); recorders.push(recorder);
}
function upload(blob, kind, at) {
  return serialized(async () => { const response = await fetch(`/crm/api/feedback/chunk?${new URLSearchParams({ study: studyId, session: sessionId, kind, at: String(at) })}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': blob.type || 'application/octet-stream' }, body: blob }); const result = await response.json(); if (!response.ok) throw new Error(result.error);
    for (const entry of result.entries || []) { entries.push(entry); line(`${stamp(entry.at)} · ${entry.text}`); }
    if (result.transcriptionError) { $('transcription-state').textContent = result.transcriptionError; captureError = true; }
    else if (kind === 'audio') $('transcription-state').textContent = 'Google speech transcription active · English · approximately 20-second updates.';
  }).catch(() => {});
}
function startAudio() {
  if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) throw new Error('WebM/Opus audio is not supported. Use Chrome or typed feedback.');
  const recorder = new MediaRecorder(micStream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 48000 }); let at = seconds();
  recorder.ondataavailable = event => { if (event.data.size) upload(event.data, 'audio', at); };
  recorder.onstop = () => { if (active) { at = seconds(); recorder.start(); } }; recorder.start(); recorders.push(recorder); audioTick = setInterval(() => { if (active && recorder.state === 'recording') recorder.stop(); }, 20000);
}
$('start-session').addEventListener('click', event => action(event.currentTarget, async () => {
  if (!$('consent').checked) throw new Error('Please review and consent before starting.');
  const microphone = $('use-mic').checked, screen = $('use-screen').checked, camera = $('use-camera').checked, faceCues = $('use-face').checked;
  if (faceCues && !camera) throw new Error('Face-cue estimates require explicit camera consent.');
  if (screen && (!screenStream || screenStream.getVideoTracks()[0].readyState !== 'live')) throw new Error('Choose a screen/tab in the browser picker first.');
  try {
    if (microphone) { micStream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 48000 }, video: false }); streams.push(micStream); }
    if (camera) { cameraStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { width: 480, height: 360 } }); streams.push(cameraStream); $('camera-preview').srcObject = cameraStream; $('camera-preview').hidden = false; await $('camera-preview').play(); }
    if (faceCues) await prepareFace();
    const joined = await api('/join', { study: studyId, invite, consent: true, microphone, screen, camera, faceCues }); sessionId = joined.sessionId; token = joined.token; started = performance.now(); active = true;
    if (microphone) startAudio(); if (screen) videoRecorder(screenStream, 'screen'); if (camera) videoRecorder(cameraStream, 'camera');
    $('capture').hidden = false; $('start-session').hidden = true; $('choose-screen').disabled = true;
    for (const id of ['consent','use-mic','use-screen','use-camera','use-face']) $(id).disabled = true;
    $('live-state').textContent = microphone || camera || screen ? '● CAPTURE LIVE — only your selected modes' : '● TYPED FEEDBACK SESSION — no device recording';
    $('transcription-state').textContent = microphone ? 'Microphone recording · Google transcript arrives in about 20 seconds.' : 'Microphone off. Typed feedback is available.';
    if (camera && !faceCues) $('face-state').textContent = 'Camera recording · face-cue detector not selected.';
    tick = setInterval(() => { $('timer').textContent = stamp(seconds()); if (seconds() >= 360) stopSession(); }, 500);
    if (faceDetector && faceCues) { let lastSaved = 0; faceTick = setInterval(() => { if (!active || $('camera-preview').readyState < 2) return; try { const result = faceDetector.detectForVideo($('camera-preview'), performance.now()); const categories = result.faceBlendshapes?.[0]?.categories || []; const names = ['jawOpen','mouthSmileLeft','mouthSmileRight','browInnerUp','eyeBlinkLeft','eyeBlinkRight']; const cues = Object.fromEntries(categories.filter(item=>names.includes(item.categoryName)).map(item=>[item.categoryName,item.score]));
      $('face-state').textContent = categories.length ? `Live estimated face cues: ${Object.entries(cues).filter(([,value])=>value>.25).map(([name,value])=>`${name} ${value.toFixed(2)}`).join(', ') || 'no strong movement detected'}. Not emotions.` : 'No face detected. No readings available.';
      if (categories.length && seconds() - lastSaved >= 5) { lastSaved = seconds(); serialized(() => api('/event', { study: studyId, sessionId, type: 'face_cues', at: seconds(), cues })).catch(()=>{}); }
    } catch (error) { $('face-state').textContent = 'Cue detection failed; no estimate available.'; clearInterval(faceTick); } }, 500); }
    status('Session started. Avoid passwords, payment information and sensitive pages. Stop whenever you want.');
  } catch (error) { active = false; streams.forEach(stream=>stream.getTracks().forEach(track=>track.stop())); recorders.forEach(recorder=>{if(recorder.state!=='inactive') recorder.stop();}); throw new Error(`Session not capturing: ${error.message}`); }
}));
async function stopSession() {
  if (stopping || !sessionId) return; stopping = true; active = false; clearInterval(tick); clearInterval(faceTick); clearInterval(audioTick); $('stop-session').disabled = true;
  const stops = recorders.filter(recorder=>recorder.state !== 'inactive').map(recorder=>new Promise(resolve=>{ recorder.addEventListener('stop',resolve,{once:true}); recorder.stop(); }));
  await Promise.all(stops); streams.forEach(stream=>stream.getTracks().forEach(track=>track.stop())); faceDetector?.close();
  faceDetector = null; $('live-state').textContent = 'CAPTURE STOPPED — saving final feedback…'; $('face-state').textContent = 'Camera and cue detection stopped.'; $('transcription-state').textContent = 'Microphone stopped.';
  try { await queue; const result = await api('/finish', { study: studyId, sessionId }); $('capture').hidden = true; $('finished').hidden = false; status(captureError ? 'Session ended, but some capture/transcription failed. The owner can review only successfully saved evidence; no missing evidence was invented.' : result.message); }
  catch(error) { status(`Capture is stopped. Saving failed: ${error.message}. Click Stop and save again to retry finalization.`); stopping = false; $('stop-session').disabled = false; }
}
$('stop-session').addEventListener('click',stopSession);
$('add-comment').addEventListener('click',event=>action(event.currentTarget,async()=>{ if(!active)throw new Error('Start a consented session first.'); const text=$('participant-comment').value.trim(); if(!text)throw new Error('Add your feedback first.'); const at=seconds(); await serialized(()=>api('/event',{study:studyId,sessionId,type:'comment',at,text,category:$('comment-category').value})); line(`${stamp(at)} · Typed: ${text}`); $('participant-comment').value=''; status('Timestamped comment saved.'); }));
$('add-context').addEventListener('click',event=>action(event.currentTarget,async()=>{ if(!active)throw new Error('Start a consented session first.'); const text=$('context-url').value.trim(); if(!text)throw new Error('Add the page or context first.'); await serialized(()=>api('/event',{study:studyId,sessionId,type:'context',at:seconds(),text:`Participant marked context: ${text}`})); status('Context marker saved.'); }));
window.addEventListener('beforeunload',event=>{if(active){event.preventDefault();event.returnValue='';}});
async function start() { try { if(studyId&&invite){ $('feedback-entry').hidden=true; const study=await api(`/study?${new URLSearchParams({study:studyId,invite})}`); $('participant').hidden=false; $('participant-title').textContent=study.title; $('participant-task').textContent=study.task; $('open-target').href=study.target; status('Read the task and choose your capture modes. Nothing is recording.'); }else{const config=await api('/config');$('creator').hidden=false; if(!config.signedIn){$('owner-login').hidden=false;status('');}else{$('open-study-form').hidden=false;$('create-panel').hidden=false;await loadStudies();status('');}} }catch(error){status(error.message);} }
start();
