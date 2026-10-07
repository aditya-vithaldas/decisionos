const $ = id => document.getElementById(id);
let account, preview, leads = [], selected, draft, returnFocus, prompts = [], replyOrder=[];
// Live voice can name any card on the board: on-screen cards first (so "the first one" is what you see), then the rest in board order.
function liveCardIds(){const seen=new Set(visibleCardIds());for(const e of document.querySelectorAll('.mail-card[data-actionable="true"],#cluster-email-cards .email-paper[data-actionable="true"]'))seen.add(`gmail-${e.dataset.threadId}`);return [...seen];}
function visibleCardIds(){return [...document.querySelectorAll('.mail-card[data-actionable="true"],#cluster-email-cards .email-paper[data-actionable="true"]')].filter(e=>{const r=e.getBoundingClientRect();return r.left<innerWidth&&r.right>0&&Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0))>=Math.min(r.height,innerHeight)*.2;}).sort((a,b)=>{const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return Math.abs(x.top-y.top)<24?x.left-y.left:x.top-y.top;}).map(e=>`gmail-${e.dataset.threadId}`);}
let activeTab = 'sales', scanning = false, stopRequested = false;
let scanRun = 0;
const sharedMailbox={complete:false,cursor:null,originTab:null,lastFetchedAt:0,nextCheck:0,failures:0};
const scans = Object.fromEntries(['sales', 'jobs', 'actions', 'finance', 'clusters'].map(tab => [tab, { items: new Map(), cursor: null, fetchCursor: null, analyzeCursor: null, fetchId: null, fetched: 0, fetchComplete: false, complete: false, scanned: 0, themes: [], visible: {}, prompt: '', attempted: false }]));
const tabNames = { sales: 'Sales & CRM', jobs: 'Job Hunting', actions: 'To-do & Actions', finance: 'Bills & Finance', clusters: 'Clustering' };
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const status = (text, detail = false) => { $(detail ? 'lead-status' : 'app-status').textContent = text; };
async function api(path, body) {
  const response = await fetch(`/crm/api${path}`, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (response.status === 401) {
    document.dispatchEvent(new Event('crm:auth-lost'));
    account = null; selected = null; draft = null; leads = []; preview = null; replyOrder = [];
    scanRun++; scanning = false; stopRequested = true;
    for (const scan of Object.values(scans)) { scan.items.clear(); scan.fetchId = null; scan.fetchCursor = null; scan.analyzeCursor = null; }
    Object.assign(sharedMailbox, { complete:false,cursor:null,originTab:null,lastFetchedAt:0,nextCheck:0,failures:0 });
    $('mail-results').replaceChildren(); $('lead-overlay').hidden = true; $('workspace').hidden = true;
    $('sheet-onboarding').hidden = true; $('signed-out').hidden = false; $('account-label').textContent = '';
    for (const id of ['draft-message','draft-subject','reply-intent','reply-timing']) $(id).value = '';
    $('lead-evidence').replaceChildren(); $('lead-title').textContent = ''; $('letter-body').replaceChildren();
    $('disconnect').hidden = true; $('logout').hidden = true;
    status('Please reconnect Google. Nothing was changed or sent.');
    throw Object.assign(new Error('Please reconnect Google. Nothing was changed or sent.'), { status:401 });
  }
  if (!response.ok) throw Object.assign(new Error(data.error || 'Please try again.'), { status: response.status });
  return data;
}
async function busy(button, action, detail = false) {
  button.disabled = true;
  try { await action(); } catch (error) { status(error.message, detail); }
  finally { button.disabled = button.id === 'send-draft' ? !account?.gmailConnected || !draft : false; }
}
function resetApproval() { $('approve-send').checked = false; if(draft)draft.approved=false; $('send-draft').disabled = !draft || !account?.gmailConnected; }
function renderBoard() {
  for (const stage of ['Hot', 'Moderate', 'Cold']) {
    const name = stage.toLowerCase(), items = leads.filter(lead => lead.stage === stage);
    $(`${name}-count`).textContent = items.length;
    const list = $(`${name}-leads`); list.replaceChildren();
    for (const lead of items) {
      const card = document.createElement('button'); card.type = 'button'; card.className = 'lead-card';
      const title = document.createElement('strong'); title.textContent = lead.name;
      const company = document.createElement('span'); company.textContent = lead.company || lead.email || 'Customer';
      const reason = document.createElement('p'); reason.textContent = lead.reason;
      const source = document.createElement('small'); source.textContent = lead.source === 'gmail' ? `Gmail thread · ${lead.category.replaceAll('_', ' ')}` : `Source row ${lead.row} · ${lead.daysSinceContact === null ? 'Limited evidence' : 'Recorded contact date'}`;
      card.append(title, company, reason, source); card.addEventListener('click', () => openLead(lead, card)); list.append(card);
    }
    if (!items.length) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = 'No leads in this stage.'; list.append(empty); }
  }
}
async function refresh() {
  const gmail = $('source-choice').value === 'gmail';
  if (gmail) return scanWorkspace();
  if (gmail && !account.gmailConnected) { status('Connect Gmail to run your selected prompt.'); return; }
  if (!gmail && !account.sheetId) { $('sheet-onboarding').hidden = false; status('Connect an optional customer sheet first.'); return; }
  const prompt = { title: $('prompt-title').value, text: $('prompt-text').value, search: $('prompt-search').value };
  if (gmail && (!prompt.title.trim() || !prompt.text.trim())) { status('Give your prompt a name and a question.'); return; }
  status(gmail ? 'Reading recent threads and checking evidence… Nothing is being sent.' : 'Reading your customer sheet…');
  const started = performance.now();
  const data = gmail ? await api('/gmail/analyze', prompt) : await api('/opportunities'); leads = data.leads;
  $('source-label').textContent = `${gmail ? 'Gmail' : data.sheet.tab + ' · Google Sheets'} · updated ${new Date(data.generatedAt).toLocaleTimeString()} · ${((performance.now() - started) / 1000).toFixed(1)}s`;
  $('selected-prompt').textContent = gmail ? `Question used — ${data.prompt.title}: ${data.prompt.text}${data.prompt.search ? ` · Mailbox filter: ${data.prompt.search}` : ''}` : 'Sheet board: evidence-based contact and sale dates. Gmail prompts do not change sheet analysis.';
  renderBoard(); status(gmail ? `${data.scannedThreads} threads reviewed; ${leads.length} evidence-backed suggestions.${data.limited ? ' This is a limited recent-thread sample, not your full mailbox.' : ''}` : `${leads.length} customer rows reviewed. ${leads.filter(lead => lead.stage === 'Done').length} marked done.`);
}
function element(tag, text, cls) { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; return e; }
function unsortedStack(items){const lane=element('section',undefined,'lane unsorted');lane.append(element('h3',`Unsorted · ${items.length}`));const stack=element('div',undefined,'unsorted-stack');for(let i=0;i<3;i++){const edge=element('span',undefined,'unsorted-edge');edge.setAttribute('aria-hidden','true');edge.style.setProperty('--layer',String(i+1));stack.append(edge);}const top=element('article',undefined,'unsorted-top');top.append(element('strong',items[0].subject||items[0].title),element('p',items[0].excerpt||items[0].quote||'','card-excerpt'));stack.append(top);lane.append(stack);return lane;}
function infoButton(item) {
  const button = element('button', 'ⓘ', 'decision-info'); button.type = 'button'; button.setAttribute('aria-label', `Classification details for ${item.title}`);
  button.addEventListener('click', () => {
    const old = document.getElementById('decision-details'); if (old) old.remove();
    const dialog = element('dialog', undefined, 'decision-details'); dialog.id = 'decision-details';
    const decision = item.decision;
    dialog.append(element('h3', 'Classification'), element('p', decision ? `Outcome: ${decision.category}` : 'No classifier probability is available for this item.'),
      element('p', decision?.probability == null ? 'Probability: unavailable' : `Probability: ${(decision.probability * 100).toFixed(1)}%`));
    if (decision) { dialog.append(element('p', decision.question)); for (const [label, probability] of Object.entries(decision.probabilities || {})) dialog.append(element('small', `${label}: ${probability == null ? 'unavailable' : `${(probability * 100).toFixed(1)}%`}`)); }
    if (item.extractionQuestion) dialog.append(element('details', undefined, 'extraction-details'));
    const detail = dialog.querySelector('details'); if (detail) detail.append(element('summary','Field extraction'),element('p','Extracted fields use quoted evidence, not a numerical confidence score.'),element('p',item.extractionQuestion));
    const close = element('button', 'Close'); close.type = 'button'; close.addEventListener('click', () => dialog.close()); dialog.append(close);
    dialog.addEventListener('close', () => { dialog.remove(); button.focus(); }); document.body.append(dialog); dialog.showModal();
  }); return button;
}
function renderWorkspace() {
  const scan = scans[activeTab], results = $('mail-results'); results.replaceChildren(); $('cluster-emails').hidden = true;
  const visibleItems=[...scan.items.values()].filter(item=>activeTab==='clusters' || item.stage!=='Other' && !(item.reviewRequired && item.decision?.category==='Other'));
  $('provider-status').textContent = scan.blocker ? 'Theme grouping needs its secure connection configured.' : '';
  $('provider-status').title = scan.blocker || '';
  $('scan-summary').textContent = scanning ? 'Checking mail…' : scan.cursor && !scan.complete ? 'Scan paused · continue when ready' : '';
  $('scan-summary').dataset.scanned = String(scan.scanned); $('scan-summary').dataset.complete = String(scan.complete);
  for (const [name, value] of Object.entries(scan.timings || {})) $('scan-summary').dataset[name] = String(Math.round(value));
  $('processing-details').hidden = !scan.attempted;
  const t=scan.timings || {}; $('processing-metrics').textContent=`Mail fetch: ${((t.gmailMs||0)/1000).toFixed(2)}s. JEV only: ${t.jevThreads||0} threads in ${t.jevRequests||0} batched requests; ${((t.modelMs||0)/1000).toFixed(2)}s classification wall time, ${t.modelMs?((t.jevThreads||0)*1000/t.modelMs).toFixed(1):'0'} threads/s. Up to 8 concurrent requests of 16 threads. Summed request time: ${((t.jevMs||0)/1000).toFixed(2)}s (overlapping). Gemini: ${t.geminiRequests||0} calls. Storage: ${((t.storeMs||0)/1000).toFixed(2)}s. Cached results make no model calls. Main throughput includes storage and page updates.${scan.fetchComplete===false?' Source fetch is incomplete: these results cover only fetched mail.':''}`;
  if (!scanning) $('scan-stage').textContent = scan.attempted && scan.timings?.totalMs ? `${scan.operation === 'fetch' ? scan.fetched : scan.scanned} threads ${scan.operation === 'fetch' ? 'fetched' : 'reviewed'} · ${(scan.timings.totalMs / 1000).toFixed(1)}s${scan.cached ? ' · saved results' : scan.cursor ? ' · paused' : ''}` : '';
  if (!visibleItems.length) { results.append(element('p', scan.complete ? 'Nothing to act on here yet.' : scanning ? 'Finding what matters…' : 'Fetch your mail to get started.', 'empty')); return; }
  if (activeTab === 'clusters') {
    const unsorted = [...scan.items.values()].some(i => i.stage === 'Unsorted');
    const labels = [...new Set([...(unsorted ? ['Unsorted'] : []), ...scan.themes, ...[...scan.items.values()].filter(i=>i.stage!=='Unsorted').map(i => i.theme)])];
    results.className = 'paper-stacks';
    for (const label of labels) {
      if(label==='Unsorted'){const group=[...scan.items.values()].filter(i=>i.stage==='Unsorted');if(group.length)results.append(unsortedStack(group));continue;}
      const group = [...scan.items.values()].filter(i => (i.stage === 'Unsorted' ? 'Unsorted' : i.theme) === label), stack = element('button', undefined, 'paper-stack'); stack.type = 'button'; stack.dataset.stage = label;
      stack.setAttribute('aria-expanded', 'false'); stack.append(element('strong', label), element('span', `${group.length} conversations`));
      stack.addEventListener('click', () => { results.querySelectorAll('button').forEach(b => b.setAttribute('aria-expanded', String(b === stack))); showCluster(label, group); }); results.append(stack);
    } return;
  }
  results.className = 'workspace-lanes';
  const unsortedItems=visibleItems.filter(i=>i.stage==='Unsorted');
  if(unsortedItems.length)results.append(unsortedStack(unsortedItems));
  const base = activeTab === 'jobs' ? ['Open', 'Inactive', 'Closed'] : activeTab === 'finance' ? ['Action required','Informational','Payment failures'] : ['Hot', 'Moderate', 'Cold', 'Done'];
  const labels = base;
  for (const label of labels) {
    const group = visibleItems.filter(i => i.stage === label), lane = element('section', undefined, `lane ${label.toLowerCase()}`);
    lane.append(element('h3', `${label} · ${group.length}`));
    for (const item of group.slice(0, scan.visible[label] || 12)) {
      const wrapper = element('div', undefined, 'mail-card'); wrapper.dataset.threadId = item.threadId;wrapper.dataset.actionable=String(!['Unsorted','Other'].includes(item.stage));
      const card = element('button', undefined, 'lead-card'); card.type = 'button';
      card.append(element('strong', item.subject || item.title), element('p', item.excerpt || item.quote || '', 'card-excerpt'));
      if(item.reviewRequired)card.append(element('small','Review'));
      if (item.finance && !item.paymentFailure) { if(item.finance.amount)card.prepend(element('span',`${item.finance.currency} ${item.finance.amount}`,'finance-amount'));if(item.finance.type)card.append(element('small',item.finance.type)); }
      if(item.paymentFailure){const failure=item.paymentFailure;card.prepend(element('span',failure.amount?`${failure.currency} ${failure.amount}`:'Payment failed','finance-amount'));if(failure.reference||failure.date)card.append(element('small',[failure.reference,failure.date].filter(Boolean).join(' · ')));}
      card.setAttribute('aria-label', `${item.subject || item.title}. ${label}`);
      const actionable = !['Unsorted','Other'].includes(item.stage);
      card.addEventListener('click', () => openLead(item, card));
      if (actionable) card.addEventListener('contextmenu', event => { event.preventDefault(); openLead(item, card); $('lead-stage').focus(); });
      const actions=element('div',undefined,'card-actions');actions.addEventListener('click',event=>event.stopPropagation());wrapper.append(card,actions); if (item.decision) actions.append(infoButton(item));
      if(item.reviewRequired){const review=element('button','Review','card-reply');review.type='button';review.addEventListener('click',()=>openLead(item,review));actions.append(review);}
      if (actionable && item.email && !/no.?reply|mailer-daemon/i.test(item.email)) { const reply=element('button','Reply','card-reply');reply.type='button';reply.addEventListener('click',()=>{openLead(item,reply);openReplyComposer();});actions.append(reply); }
      for(const [label,value] of [['Done','done'],['Not important','notImportant']]) {const action=element('button',label,'card-reply');action.type='button';action.addEventListener('click',()=>busy(action,()=>disposeMail(item,value)));actions.append(action);}
      lane.append(wrapper);
    } if (!group.length) lane.append(element('p', 'No items', 'empty')); results.append(lane);
    if (group.length > (scan.visible[label] || 12)) { const more = element('button', `Show more (${group.length - (scan.visible[label] || 12)})`, 'show-more'); more.type = 'button'; more.addEventListener('click',()=>{scan.visible[label]=(scan.visible[label]||12)+24;renderWorkspace();});lane.append(more); }
  }
}
async function showCluster(label, items) {
  $('cluster-title').textContent = label; $('cluster-emails').hidden = false; $('cluster-email-cards').replaceChildren();
  for (const item of items) {
    const card = element('article', undefined, 'email-paper'), link = element('a', 'Open in Gmail ↗');card.dataset.threadId=item.threadId;card.dataset.actionable=String(!['Unsorted','Other'].includes(item.stage)); link.href = item.sourceUrl; link.target = '_blank'; link.rel = 'noopener noreferrer';
    const body = element('div', undefined, 'email-body'), read = element('button', 'Read conversation'); read.type = 'button';
    read.addEventListener('click', () => busy(read, async () => {
      const data = await api(`/workspace/thread?id=${encodeURIComponent(item.threadId)}`); body.replaceChildren();
      for (const message of data.thread?.messages || []) body.append(element('small', `${message.from} · ${new Date(message.date).toLocaleString()}`), element('p', message.text));
      read.hidden = true;
    }));
    const letter = element('button', 'Open letter'); letter.type='button';letter.addEventListener('click',()=>openLead(item,letter));
    card.append(element('h4', item.title), element('p', item.excerpt), link, letter, read, body); if (item.decision) card.append(infoButton(item)); $('cluster-email-cards').append(card);
  }
  $('cluster-title').tabIndex = -1; $('cluster-title').focus();
}
function applySharedMailbox(data){
  sharedMailbox.complete=Boolean(data.fetchComplete);sharedMailbox.lastFetchedAt=Date.parse(data.lastFetchedAt)||Date.now();
  for(const [tab,scan]of Object.entries(scans)){
    const days=tab==='jobs'?180:tab==='clusters'?14:7,cutoff=Date.now()-days*86400000,dismissed=new Set(data.dismissedByTab?.[tab]||[]);
    scan.sourceKeys ||= new Map();for(const[id,item]of scan.items)if(new Date(item.lastTouch)<cutoff||dismissed.has(id)){scan.items.delete(id);scan.sourceKeys.delete(id);}
    for(const source of data.items||[]){if(new Date(source.lastTouch)<cutoff||dismissed.has(source.id))continue;scan.sourceKeys.set(source.id,source.lastMessageId);const prior=scan.items.get(source.id);if(prior?.lastMessageId===source.lastMessageId)continue;scan.items.set(source.id,{...source,kind:tab,stage:'Unsorted',theme:'Unsorted'});scan.complete=false;}scan.sourceTotal=scan.sourceKeys.size;
    scan.fetchId=data.fetchIds?.[tab]||scan.fetchId;scan.fetchComplete=data.fetchComplete;scan.fetched=data.fetched;scan.analyzeCursor=null;
  }
  let updated=$('mailbox-updated');if(!updated){updated=element('p',undefined,'crm-live-status');updated.id='mailbox-updated';document.querySelector('.workspace-head').after(updated);}updated.textContent=`Shared mailbox · ${data.fetched} stored threads · updated ${new Date(sharedMailbox.lastFetchedAt).toLocaleTimeString()} · checks every 5 minutes while active`;
}
// Speed panel: the headline is JEV's measured classification throughput. Displayed values ease toward
// the latest measured targets every animation frame, so numbers and the bar move smoothly between updates.
const speed={target:{count:0,total:0,rate:null},shown:{count:0,rate:0},started:0,end:0,running:false,frame:0};
function speedFrame(){const t=speed.target,shown=speed.shown,ease=motionPreference.matches?1:.16;
  shown.count+=(t.count-shown.count)*ease;if(Math.abs(t.count-shown.count)<.5)shown.count=t.count;
  if(t.rate!=null){shown.rate+=(t.rate-shown.rate)*ease;if(Math.abs(t.rate-shown.rate)<.5)shown.rate=t.rate;}
  $('speed-count').textContent=Math.round(shown.count).toLocaleString();$('speed-total').textContent=t.total?t.total.toLocaleString():'?';
  $('speed-rate').textContent=t.rate==null?'–':Math.round(shown.rate).toLocaleString();
  $('speed-time').textContent=(((speed.running?performance.now():speed.end)-speed.started)/1000).toFixed(1);
  $('speed-hero').style.setProperty('--speed-progress',String(t.total?Math.min(1,shown.count/t.total):0));
  speed.frame=speed.running||shown.count!==t.count||(t.rate!=null&&shown.rate!==t.rate)?requestAnimationFrame(speedFrame):0;}
function speedUpdate(values){Object.assign(speed.target,values);if(!speed.frame)speed.frame=requestAnimationFrame(speedFrame);}
function speedStart(scan){clearTimeout(speed.compact);$('speed-hero').classList.remove('compact');Object.assign(speed,{started:performance.now(),running:true,shown:{count:scan.scanned||0,rate:0},target:{count:scan.scanned||0,total:scan.sourceTotal||0,rate:null}});const hero=$('speed-hero');hero.hidden=false;hero.classList.remove('complete');$('speed-kicker').textContent='Classifying with JEV';$('speed-note').textContent='';speedUpdate({});}
function speedFinish(scan){if(!speed.running)return;speed.running=false;speed.end=performance.now();const t=scan.timings||{},hero=$('speed-hero');
  if(!t.modelMs){$('speed-kicker').textContent=scan.cached?'Loaded saved results':'No new emails classified';$('speed-note').textContent=scan.cached?'Saved results make no model calls.':'';speedUpdate({count:scan.scanned||0});return;}
  hero.classList.toggle('complete',Boolean(scan.complete));$('speed-kicker').textContent=scan.complete?`${(t.jevThreads||0).toLocaleString()} emails classified`:'Paused';
  const total=t.totalMs||speed.end-speed.started;$('speed-note').textContent=`JEV classification ${(t.modelMs/1000).toFixed(2)}s in ${t.jevRequests||0} parallel requests · end to end ${(total/1000).toFixed(1)}s, ${Math.round((scan.scanned||0)*1000/total)}/s including storage and page updates`;
  speedUpdate({count:scan.scanned||0,rate:(t.jevThreads||0)*1000/t.modelMs});speed.compact=setTimeout(()=>{if(!speed.running)hero.classList.add('compact');},6000);}
$('speed-close').addEventListener('click',()=>{$('speed-hero').hidden=true;});
// Cards glide from their previous positions after each batch (FLIP, transform/opacity only, on-screen cards only).
function flipCards(before){let fresh=0;for(const card of document.querySelectorAll('.mail-card[data-thread-id]')){const now=card.getBoundingClientRect();if(now.bottom<0||now.top>innerHeight)continue;const old=before.get(card.dataset.threadId);
  if(old){const dx=old.left-now.left,dy=old.top-now.top;if(Math.abs(dx)+Math.abs(dy)>1)card.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'none'}],{duration:420,easing:'cubic-bezier(.2,.8,.2,1)'});}
  else card.animate([{opacity:0,transform:'translateY(10px) scale(.98)'},{opacity:1,transform:'none'}],{duration:320,delay:Math.min(fresh++,12)*25,easing:'ease-out',fill:'backwards'});}}
function updateAnalysisProgress(scan,count,total=scan.sourceTotal){const bar=$('scan-progress');bar.hidden=false;bar.setAttribute('aria-label','Classified stored mail');const known=Number.isFinite(total)&&total>=0;bar.classList.toggle('indeterminate',!known);if(known){const reviewed=Math.max(0,Math.min(total,count));bar.style.setProperty('--analysis-progress',`${total?reviewed/total*100:0}%`);bar.setAttribute('aria-valuenow',String(reviewed));bar.setAttribute('aria-valuemax',String(Math.max(1,total)));bar.setAttribute('aria-valuetext',`${reviewed} of ${total} eligible threads reviewed`);}if(speed.running)speedUpdate({count:known?Math.max(0,Math.min(total,count)):count,total:known?total:speed.target.total});else{bar.removeAttribute('aria-valuenow');bar.removeAttribute('aria-valuemax');bar.setAttribute('aria-valuetext','Eligible total unknown');}}
$('close-cluster').addEventListener('click', () => { $('cluster-emails').hidden = true; document.querySelector('.paper-stack[aria-expanded="true"]')?.focus(); });
$('stop-scan').addEventListener('click', () => { stopRequested = true; $('stop-scan').textContent = 'Stopping after this batch…'; });
async function scanWorkspace(operation = 'analyze',automatic=false) {
  if (!account?.gmailConnected) { status('Connect your own Gmail account before analyzing.'); return; }
  if (scanning) return;
  const tab = operation==='fetch' && sharedMailbox.cursor ? sharedMailbox.originTab : activeTab, scan = scans[tab];
  if (operation === 'analyze' && !scan.fetchId) { status('Fetch Mail first.'); return; }
  scan.cursor = operation === 'fetch' ? sharedMailbox.cursor : scan.analyzeCursor;
  scanning = true; stopRequested = false; scan.operation = operation;
  if (!scan.cursor) {
    Object.assign(scan, { complete: false, scanned: 0, timings: { gmailMs: 0, modelMs: 0, storeMs: 0, cacheHits: 0 }, prompt: $('prompt-details').open ? $('prompt-text').value : '', blocker: '', attempted: true, cached: false });
    if (operation === 'fetch') {sharedMailbox.originTab=tab;Object.assign(scan, { fetchComplete: false, analyzeCursor: null });}
  }
  $('scan-progress').classList.remove('complete');$('scan-progress').hidden=operation!=='analyze';if(operation==='analyze'){speedStart(scan);updateAnalysisProgress(scan,scan.scanned);} $('stop-scan').hidden = false; $('stop-scan').textContent = 'Stop scan';
  $('refresh-board').disabled = true; document.querySelectorAll('[data-workspace-tab]').forEach(b => b.disabled = true);
  $('fetch-mail').disabled = true;
  const started = performance.now();
  const run = ++scanRun; let polling = false;
  $('scan-stage').textContent = operation === 'fetch' ? 'Fetching emails…' : 'Classifying stored emails…';
  async function pollProgress() {
    if (polling || !scanning || run !== scanRun) return;
    polling = true;
    try {
      const progress = await api(`/workspace/progress?tab=${encodeURIComponent(tab)}`);
      if (!scanning || run !== scanRun || !['fetching','classifying','preparing'].includes(progress.stage)) return;
      const seconds = (performance.now() - started) / 1000;
      const label = progress.stage === 'fetching' ? `Fetching emails · ${(progress.scanned + progress.fetched).toLocaleString()} threads fetched`
        : progress.stage === 'classifying' ? `Classifying emails · ${progress.classified}/${progress.batchTotal ?? '?'} in this batch`
          : 'Preparing cards';
      const reviewed = Math.max(scan.scanned, (progress.scanned || 0) + (operation==='fetch'?progress.fetched || 0:progress.classified || 0));
      if(operation==='analyze')updateAnalysisProgress(scan,reviewed,progress.eligibleTotal??scan.sourceTotal);
      $('scan-stage').textContent = `${label} · ${seconds.toFixed(1)}s${reviewed && seconds ? ` · ${(reviewed / seconds).toFixed(1)} ${operation==='fetch'?'fetched':'reviewed'} threads/s` : ''}`;
    } catch { /* The scan's own response owns actionable errors; polling never invents progress. */ }
    finally { polling = false; }
  }
  const progressTimer = setInterval(pollProgress, 500);
  try {
    do {
      status('');
      const data = await api(`/workspace/${operation}`, { tab, cursor: scan.cursor, fetchId: scan.fetchId, prompt: scan.prompt });
      const before = new Map([...document.querySelectorAll('.mail-card[data-thread-id]')].map(e=>[e.dataset.threadId,e.getBoundingClientRect()]));
      const unsortedStack = [...document.querySelectorAll('.paper-stack')].find(e=>e.dataset.stage==='Unsorted')?.getBoundingClientRect() || document.querySelector('.lane.unsorted')?.getBoundingClientRect();
      if (data.replaceItems) for (const [id,item] of scan.items) if (item.stage !== 'Unsorted' && (tab!=='jobs' || scan.sourceKeys?.has(id))) scan.items.delete(id);
      if(operation==='fetch' && data.shared)applySharedMailbox(data);
      else for (const item of data.items) { if(operation==='fetch' && scan.items.get(item.id)?.lastMessageId===item.lastMessageId)continue;for (const thread of item.applicationThreads || []) scan.items.delete(`gmail-${thread.threadId}`); scan.items.set(item.id, item); }
      Object.assign(scan, { cursor: data.nextCursor, scanned: data.scanned, complete: !data.nextCursor, fetched: data.fetched, fetchComplete: data.fetchComplete, themes: data.themes || scan.themes, blocker: data.providerBlocker || '', model: data.model });
      if(operation==='analyze')updateAnalysisProgress(scan,data.scanned,data.eligibleTotal??scan.sourceTotal);
      if (operation === 'fetch') { scan.fetchId = data.fetchId; scan.fetchCursor = data.nextCursor;sharedMailbox.cursor=data.nextCursor; } else scan.analyzeCursor = data.nextCursor;
      scan.cached = Boolean(data.cached);
      for (const name of ['gmailMs','modelMs','storeMs','cacheHits','jevMs','jevRequests','jevThreads','geminiMs','geminiRequests']) scan.timings[name] = (scan.timings[name] || 0) + (data.timings?.[name] || 0);
      scan.timings.totalMs = performance.now() - started;
      if (operation === 'analyze' && scan.timings.modelMs) speedUpdate({ rate: scan.timings.jevThreads * 1000 / scan.timings.modelMs });
      $('source-label').textContent = `Gmail · ${((performance.now() - started) / 1000).toFixed(1)}s${data.cached ? ' · saved results' : ''}`; renderWorkspace();
      if (!data.cached && !motionPreference.matches) flipCards(before);
      if(operation==='analyze'&&unsortedStack&&!data.cached&&!motionPreference.matches){const results=$('mail-results'),bounds=results.getBoundingClientRect(),layer=element('div',undefined,'sorting-layer');layer.setAttribute('aria-hidden','true');results.append(layer);for(const theme of [...new Set(data.items.filter(i=>!['Unsorted','Other'].includes(i.stage)).map(i=>tab==='clusters'?i.theme:i.stage))].slice(0,3)){const target=tab==='clusters'?[...results.querySelectorAll('.paper-stack')].find(e=>e.dataset.stage===theme):[...results.querySelectorAll('.lane')].find(e=>e.querySelector('h3')?.textContent.startsWith(`${theme} ·`));if(!target)continue;const end=target.getBoundingClientRect(),paper=element('span',undefined,'sorting-paper');Object.assign(paper.style,{position:'absolute',left:`${unsortedStack.left-bounds.left+20}px`,top:`${unsortedStack.top-bounds.top+20}px`});layer.append(paper);const flight=paper.animate([{transform:'translate(0,0)',opacity:.6},{transform:`translate(${end.left-unsortedStack.left}px,${end.top-unsortedStack.top}px)`,opacity:0}],{duration:400,easing:'ease-out'});const remove=()=>{paper.remove();if(!layer.childElementCount)layer.remove();};flight.onfinish=remove;flight.oncancel=remove;}if(!layer.childElementCount)layer.remove();}
    } while (scan.cursor && !stopRequested);
    if(operation==='fetch'){sharedMailbox.failures=0;sharedMailbox.nextCheck=Date.now()+5*60000;}
    status(scan.complete ? '' : 'Scan paused. Continue when ready.');
  } catch (error) {if(operation==='fetch'){sharedMailbox.complete=false;sharedMailbox.failures++;sharedMailbox.nextCheck=Date.now()+Math.min(30*60000,60000*2**Math.min(sharedMailbox.failures-1,5));}status(`${error.message} Completed batches remain visible; run again to retry.`); }
  finally { clearInterval(progressTimer); scanRun++; scanning = false;if(operation==='analyze')speedFinish(scan);if(operation==='analyze'&&scan.complete){$('scan-progress').classList.add('complete');const fadeRun=scanRun;setTimeout(()=>{if(!scanning&&scanRun===fadeRun)$('scan-progress').hidden=true;},300);}else $('scan-progress').hidden=true; $('stop-scan').hidden = true; $('refresh-board').disabled = !scan.fetchId; $('fetch-mail').disabled = sharedMailbox.complete; document.querySelectorAll('[data-workspace-tab]').forEach(b => b.disabled = false); renderWorkspace(); selectTab(activeTab); }
}
function selectTab(tab) {
  activeTab = tab; document.querySelectorAll('[data-workspace-tab]').forEach(b => { const active = b.dataset.workspaceTab === tab; b.setAttribute('aria-selected', String(active)); b.tabIndex = active ? 0 : -1; });
  $('mail-workspace').setAttribute('aria-labelledby', `tab-${tab}`);
  $('selected-prompt').textContent = tab === 'clusters' ? 'Shared two-week cache · JEV-only topics. No automatic theme generation.' : tab === 'jobs' ? 'Shared mail plus previously saved application evidence. Older history may be incomplete; no automatic 180-day refetch.' : 'One week of shared stored mail · JEV-only classification. No automatic generation or Gmail refetch.';
  $('fetch-mail').textContent = sharedMailbox.cursor ? 'Continue Fetch' : 'Fetch Mail';$('fetch-mail').disabled=scanning || sharedMailbox.complete;
  $('refresh-board').textContent = scans[tab].analyzeCursor ? 'Continue Analysis' : 'Analyze Mail'; $('refresh-board').disabled = !scans[tab].fetchId; renderWorkspace();
}
$('fetch-mail').addEventListener('click', () => scanWorkspace('fetch'));
document.querySelectorAll('[data-workspace-tab]').forEach(button => {
  button.addEventListener('click', () => selectTab(button.dataset.workspaceTab));
  button.addEventListener('keydown', event => { const tabs = [...document.querySelectorAll('[data-workspace-tab]')], index = tabs.indexOf(button); if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length; tabs[next].click(); tabs[next].focus(); });
});
function choosePrompt() {
  const item = prompts.find(prompt => prompt.id === $('prompt-choice').value);
  if (!item) return;
  $('prompt-title').value = item.title; $('prompt-text').value = item.text;
  $('prompt-search').value = item.search || '';
  $('save-prompt').textContent = item.illustrative ? 'Save as my template' : 'Save changes';
  $('prompt-status').textContent = item.illustrative ? 'Illustrative starter — refine it to fit your business.' : 'Your saved template. Changes stay private to this account.';
}
function renderPrompts(id) {
  $('prompt-choice').replaceChildren(...prompts.map(item => new Option(`${item.title}${item.illustrative ? ' · example' : ' · mine'}`, item.id)));
  if (id) $('prompt-choice').value = id; choosePrompt();
}
async function savePrompt(copy) {
  const current = prompts.find(item => item.id === $('prompt-choice').value);
  const saved = await api('/prompts/save', { title: $('prompt-title').value, text: $('prompt-text').value, search: $('prompt-search').value,
    ...(!copy && current && !current.illustrative ? { id: current.id } : {}) });
  const index = prompts.findIndex(item => item.id === saved.id); if (index < 0) prompts.push(saved); else prompts[index] = saved;
  renderPrompts(saved.id); $('prompt-status').textContent = 'Saved to your private prompt library.';
}
$('prompt-choice').addEventListener('change', choosePrompt);
$('save-prompt').addEventListener('click', event => busy(event.currentTarget, () => savePrompt(false)));
$('duplicate-prompt').addEventListener('click', event => busy(event.currentTarget, () => savePrompt(true)));
$('new-prompt').addEventListener('click', () => { $('prompt-choice').selectedIndex = -1; $('prompt-title').value = ''; $('prompt-text').value = ''; $('prompt-search').value = ''; $('save-prompt').textContent = 'Save new template'; $('prompt-status').textContent = 'Write your starting question, then save it.'; $('prompt-title').focus(); });
$('source-choice').addEventListener('change', () => { const gmail = $('source-choice').value === 'gmail'; $('prompt-details').hidden = !gmail; $('mail-workspace').hidden = !gmail; document.querySelector('.workspace-tabs').hidden = !gmail; $('sheet-board').hidden = gmail; $('refresh-board').textContent = gmail ? 'Run analysis' : 'Refresh sheet'; leads = []; renderBoard(); if (gmail) selectTab(activeTab); status('Choose your question and refresh this source.'); });
$('show-sheet').addEventListener('click', () => { if (!account.sheetsConnected) { location.href = '/crm/api/oauth/start'; return; } $('sheet-onboarding').hidden = false; $('sheet-url').focus(); });
const leadBody = () => ({ source: selected.source || 'sheet', kind: selected.kind, id: selected.id, row: selected.row, email: selected.email, name: selected.name });
function openLead(lead, card, loadLetter=true) {
  replyOrder=liveCardIds();
  document.querySelector('.lead-panel').dataset.threadId=lead.threadId||'';
  document.querySelector('.lead-panel').classList.remove('reply-mode');
  selected = lead; draft = null; returnFocus = card;
  $('lead-title').textContent = lead.title || lead.name; $('lead-row').textContent = lead.source === 'gmail' ? 'Gmail conversation' : `Sheet row ${lead.row}`; $('lead-reason').textContent = lead.reason || '';
  $('lead-source').hidden = lead.source !== 'gmail'; if (lead.source === 'gmail') $('lead-source').href = lead.sourceUrl;
  $('lead-evidence').replaceChildren(...(lead.evidence || [lead.quote || lead.excerpt || '']).map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
  $('lead-stage').replaceChildren(...(lead.kind === 'finance' ? ['Action required','Informational','Payment failures'] : lead.kind === 'jobs' ? ['Open', 'Closed', 'Inactive'] : ['Hot', 'Moderate', 'Cold', 'Done']).map(s => new Option(s, s)));
  $('save-stage').parentElement.hidden = ['Unsorted','Other'].includes(lead.stage) || lead.kind === 'clusters';
  $('lead-stage').value = lead.stage; $('draft-editor').hidden = true; $('reply-questions').hidden = true; $('history-list').replaceChildren();
  $('history-block').hidden = !account.gmailConnected; $('create-draft').disabled = !lead.email || /no.?reply|mailer-daemon/i.test(lead.email) || ['Other','Unsorted'].includes(lead.stage);
  $('reply-proposal').textContent = lead.recommendedDraft || 'No response proposed for this message.';
  $('discard-mail').hidden = lead.source !== 'gmail';
  $('letter-body').replaceChildren(element('small',`From: ${lead.email||lead.name||'See source sender'}`),element('p',lead.quote||lead.excerpt||'Loading your letter…'));
  if (lead.source === 'gmail' && loadLetter) api(`/workspace/thread?id=${encodeURIComponent(lead.threadId)}`).then(data=>{
    if(selected?.id!==lead.id)return; $('letter-body').replaceChildren();
    for(const message of data.thread?.messages||[]) $('letter-body').append(element('small',`${message.sentByOwner ? 'You' : message.from} · ${new Date(message.date).toLocaleString()}`),element('p',message.text));
  }).catch(error=>{if(selected?.id===lead.id)$('letter-body').append(element('small',`Full conversation unavailable: ${error.message}`));});
  resetApproval(); status('', true); $('lead-overlay').hidden = false; document.body.style.overflow = 'hidden';
  document.querySelector('.close').focus();
  if(lead.source==='gmail')document.dispatchEvent(new CustomEvent('crm:selected',{detail:{id:lead.id,lastMessageId:lead.lastMessageId}}));
}
$('discard-mail').addEventListener('click',event=>busy(event.currentTarget,async()=>{
  await disposeMail(selected,'notImportant');resetApproval();draft=null;
},true));
function closeLead() { $('lead-overlay').hidden = true; document.body.style.overflow = ''; returnFocus?.focus(); }
async function disposeMail(item,value) {
  const order=$('lead-overlay').hidden?liveCardIds():replyOrder;
  await api('/workspace/disposition',{id:item.id,lastMessageId:item.lastMessageId,status:value});
  const removed=[];for(const [tab,scan] of Object.entries(scans)) for(const [id,candidate] of scan.items) if(candidate.threadId===item.threadId && candidate.lastMessageId===item.lastMessageId) {removed.push([tab,id,candidate]);scan.items.delete(id);scan.sourceKeys?.delete(id);scan.sourceTotal=scan.sourceKeys?.size;}
  if(selected?.id===item.id && !$('lead-overlay').hidden)closeLead();renderWorkspace();status('');document.dispatchEvent(new CustomEvent('crm:processed',{detail:{id:item.id,lastMessageId:item.lastMessageId,order}}));
  const undo=element('button','Undo','card-reply');undo.type='button';undo.addEventListener('click',()=>busy(undo,async()=>{await api('/workspace/disposition',{id:item.id,lastMessageId:item.lastMessageId,status:'restored'});for(const [tab,id,candidate] of removed){scans[tab].items.set(id,candidate);scans[tab].sourceKeys?.set(id,candidate.lastMessageId);scans[tab].sourceTotal=scans[tab].sourceKeys?.size;}renderWorkspace();status('Restored.');}));$('app-status').append(undo);
}
$('mark-done').addEventListener('click',e=>busy(e.currentTarget,()=>disposeMail(selected,'done'),true));
$('mark-unimportant').addEventListener('click',e=>busy(e.currentTarget,()=>disposeMail(selected,'notImportant'),true));
document.querySelectorAll('[data-close]').forEach(element => element.addEventListener('click', closeLead));
document.addEventListener('keydown', event => {
  if ($('lead-overlay').hidden) return;
  if (event.key === 'Escape') closeLead();
  if (event.key === 'Tab') {
    const elements = [...document.querySelectorAll('.lead-panel button, .lead-panel input, .lead-panel select, .lead-panel textarea')].filter(el => !el.disabled && el.getClientRects().length);
    const first = elements[0], last = elements.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
$('toggle-cold').addEventListener('click', () => { const open = $('cold-leads').hidden; $('cold-leads').hidden = !open; $('toggle-cold').setAttribute('aria-expanded', String(open)); });
$('refresh-board').addEventListener('click', event => busy(event.currentTarget, refresh));
async function showPreview(tab) {
  preview = await api(`/sheet/preview?url=${encodeURIComponent($('sheet-url').value)}${tab ? `&tab=${encodeURIComponent(tab)}` : ''}`);
  $('sheet-title').textContent = preview.title;
  $('sheet-tab').replaceChildren(...preview.tabs.map(name => { const option = new Option(name, name); option.selected = name === preview.tab; return option; }));
  $('mapping-fields').replaceChildren();
  const labels = { name: 'Customer name', email: 'Email', company: 'Company', lastContact: 'Last contact', lastSale: 'Last sale', sales: 'Sales / revenue', notes: 'Notes', stage: 'Lead stage' };
  for (const [key, label] of Object.entries(labels)) {
    const wrapper = document.createElement('label'); wrapper.textContent = label;
    const select = document.createElement('select'); select.dataset.mapping = key; select.append(new Option('Not mapped', '-1'));
    (preview.preview[0] || []).forEach((heading, index) => select.append(new Option(`${index + 1}. ${heading || 'Unnamed column'}`, String(index))));
    select.value = String(preview.suggestedMapping[key]); wrapper.append(select); $('mapping-fields').append(wrapper);
  }
  $('sheet-details').hidden = false; $('add-columns').checked = false; status('Review the column mapping before connecting.');
}
$('preview-sheet').addEventListener('click', event => busy(event.currentTarget, () => showPreview()));
$('sheet-tab').addEventListener('change', event => busy(event.currentTarget, () => showPreview(event.currentTarget.value)));
$('connect-sheet').addEventListener('click', event => busy(event.currentTarget, async () => {
  const mapping = Object.fromEntries([...document.querySelectorAll('[data-mapping]')].map(select => [select.dataset.mapping, Number(select.value)]));
  await api('/sheet/connect', { sheetId: preview.id, tab: preview.tab, mapping, addTrackingColumns: $('add-columns').checked });
  await start();
}));
$('save-stage').addEventListener('click', event => busy(event.currentTarget, async () => {
  await api(selected.kind ? '/workspace/status' : '/lead/stage', { ...leadBody(), stage: $('lead-stage').value });
  selected.stage = $('lead-stage').value; selected.manualStatus = true; renderBoard(); renderWorkspace(); status(selected.source === 'gmail' ? 'Status saved in your private workspace. Gmail was not changed.' : 'Stage updated in your sheet.', true);
}, true));
function openReplyComposer() {
  document.querySelector('.lead-panel').classList.add('reply-mode');
  $('reply-questions').hidden=false;$('draft-editor').hidden=false;draft=null;$('draft-to').textContent=`To: ${selected.email||'Recipient will be verified'}`;$('draft-subject').value=/^re:/i.test(selected.subject||selected.title)?selected.subject||selected.title:`Re: ${selected.subject||selected.title}`;$('draft-message').value='';$('draft-message').placeholder='Brief reply appears here. You can edit it before sending.';resetApproval();
  $('reply-question').textContent=selected.kind==='jobs'?'What would you like to ask or confirm about this application?':selected.kind==='finance'?'What should this reply clarify about the bill or payment?':'What would you like this reply to achieve?';
  $('reply-intent').value='';$('reply-timing').value='';$('reply-intent').focus();
}
$('create-draft').addEventListener('click', openReplyComposer);
$('generate-reply').addEventListener('click', event => busy(event.currentTarget, async () => {
  draft = await api('/lead/draft', {...leadBody(),replyIntent:$('reply-intent').value,replyTiming:$('reply-timing').value});
  $('draft-to').textContent = `To: ${draft.to}`; $('draft-subject').value = draft.subject; $('draft-message').value = draft.message;
  $('reply-questions').hidden=true;$('draft-editor').hidden = false; resetApproval(); status('Review and edit. Nothing has been sent.',true);
}, true));
for (const id of ['draft-subject', 'draft-message']) $(id).addEventListener('input', resetApproval);
$('approve-send').addEventListener('change', () => { $('send-draft').disabled = !$('approve-send').checked || !account.gmailConnected || !draft; });
$('send-draft').addEventListener('click', event => busy(event.currentTarget, async () => {
  if (!draft || !account?.gmailConnected) return;
  const id = draft.id; draft = null; resetApproval();
  const result = await api('/lead/send', { draftId: id, approved: true, subject: $('draft-subject').value, message: $('draft-message').value });
  $('draft-editor').hidden = true; status(result.message, true);const processed=selected;closeLead();document.dispatchEvent(new CustomEvent('crm:processed',{detail:{id:processed.id,lastMessageId:processed.lastMessageId,order:replyOrder}}));
}, true));
$('load-history').addEventListener('click', event => busy(event.currentTarget, async () => {
  const result = await api(`/lead/history?${new URLSearchParams({ source: selected.source || 'sheet', kind:selected.kind || '', id: selected.id || '', row: selected.row || '', email: selected.email })}`);
  $('history-list').replaceChildren(...result.messages.map(message => {
    const li = document.createElement('li'); const title = document.createElement('strong'); title.textContent = message.headers.subject || 'No subject';
    const text = document.createElement('p'); text.textContent = `${new Date(message.date).toLocaleDateString()} · ${message.snippet}`; li.append(title, text); return li;
  })); status(result.messages.length ? 'Recent correspondence loaded.' : 'No recent correspondence found.', true);
}, true));
$('logout').addEventListener('click', event => busy(event.currentTarget, async () => { await api('/logout', {}); location.reload(); }));
$('disconnect').addEventListener('click', event => busy(event.currentTarget, async () => { await api('/disconnect', {}); location.reload(); }));
async function start() {
  for (const id of ['signed-out', 'sheet-onboarding', 'workspace']) $(id).hidden = true;
  try {
    await api('/config');
    try { account = await api('/me'); } catch (error) {
      if (error.status === 401) { $('signed-out').hidden = false; status(''); return; } throw error;
    }
    $('account-label').textContent = account.email; $('logout').hidden = false; $('disconnect').hidden = false;
    $('workspace').hidden = false; $('connect-gmail').hidden = account.gmailConnected;
    prompts = (await api('/prompts')).prompts; renderPrompts();
    if (account.gmailConnected) { const saved = await api('/workspace/saved'); for (const item of saved.items || []) scans[item.kind]?.items.set(item.id, item);const result=await api('/workspace/cache');if(result.cache)applySharedMailbox(result.cache); }
    $('source-choice').value = 'gmail'; $('prompt-library').hidden = false;
    selectTab(activeTab); if(!scanning)status(account.gmailConnected ? '' : 'Connect Gmail to begin.');void checkSharedMailbox();
  } catch (error) { $('signed-out').hidden = Boolean(account); status(error.message); }
}
start();
async function checkSharedMailbox(){if(!account?.gmailConnected || scanning || document.visibilityState!=='visible')return;const due=sharedMailbox.nextCheck || sharedMailbox.lastFetchedAt+5*60000;if(Date.now()<due)return;if(!sharedMailbox.lastFetchedAt && !sharedMailbox.cursor)return;await scanWorkspace('fetch',true);}
setInterval(()=>void checkSharedMailbox(),15000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void checkSharedMailbox();});
import('/assets/crm-live.js').then(({mountLive})=>mountLive({api,commandPreview:location.hostname==='127.0.0.1',
 context:()=>({tab:activeTab,fetchId:scans[activeTab].fetchId,cards:(!$('lead-overlay').hidden && selected?[selected]:liveCardIds().map(id=>scans[activeTab].items.get(id))).filter(item=>item&&!['Unsorted','Other'].includes(item.stage)).slice(0,100).map(item=>({id:item.id,lastMessageId:item.lastMessageId,title:item.subject||item.title,who:item.company||item.name||'',tab:activeTab}))}),
 target:id=>!$('lead-overlay').hidden&&selected?.id===id?document.querySelector('.lead-panel'):document.querySelector(`.mail-card[data-thread-id="${id.slice(6)}"],#cluster-email-cards .email-paper[data-thread-id="${id.slice(6)}"]`),
 reply:(id,intent)=>{const item=scans[activeTab].items.get(id);if(!item)throw Error('Displayed card changed.');openLead(item,document.querySelector(`.mail-card[data-thread-id="${item.threadId}"]`),true);openReplyComposer();$('reply-intent').value=intent;return {subject:item.subject||item.title,from:item.email||item.name,excerpt:(item.excerpt||item.quote||'').slice(0,2000)};},
 dispose:(id,value)=>{const item=scans[activeTab].items.get(id);if(!item)throw Error('Displayed card changed.');return disposeMail(item,value);},
 card:id=>{const item=scans[activeTab].items.get(id);if(!item||['Unsorted','Other'].includes(item.stage)||!document.querySelector(`.mail-card[data-thread-id="${item.threadId}"][data-actionable="true"],#cluster-email-cards .email-paper[data-thread-id="${item.threadId}"][data-actionable="true"]`))return null;return {id:item.id,lastMessageId:item.lastMessageId,title:item.subject||item.title,who:item.company||item.name||'',tab:activeTab};},
 replyOpen:()=>!$('lead-overlay').hidden && document.querySelector('.lead-panel').classList.contains('reply-mode'),
 dictate:text=>{$('reply-intent').value=text;},
 recipient:id=>{const item=scans[activeTab].items.get(id);return item?.recipients?.join(', ') || (item?.outbound?item.email:'') || '';},
 liveDraft:async(id,message)=>{if(selected?.id!==id)throw Error('Selected reply changed.');status('Preparing brief reply…',true);const result=await api('/lead/draft',{...leadBody(),liveDraft:message});if(selected?.id!==id)throw Error('Selected reply changed. Draft not displayed.');draft=result;$('draft-to').textContent=`To: ${draft.to}`;$('draft-subject').value=draft.subject;$('draft-message').value=draft.message;$('reply-questions').hidden=true;$('draft-editor').hidden=false;resetApproval();status('Live draft ready. Review and edit; nothing sent.',true);}
})).catch(error=>status(`Live controls unavailable: ${error.message}`));
