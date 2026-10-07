import { randomBytes, createHash } from 'node:crypto';
import { workspaceTabs, workspaceQuery, workspaceThread, checkedThemes, classifyThemeBatch, mergeJobApplications,sourcePaymentFailure } from './crm-workspace.mjs';

const hash = value => createHash('sha256').update(value).digest('base64url');
const visible = (c, tab, stage = 'Unsorted') => ({ ...c, messages: undefined, source: 'gmail', id: `gmail-${c.threadId}`, kind: tab,
  title: c.subject, stage, theme: stage, excerpt: c.messages.at(-1)?.text.slice(0, 320) || '', quote: c.messages.at(-1)?.text.slice(0, 180) || '',
  sourceUrl: `https://mail.google.com/mail/u/0/#all/${c.threadId}` });
const lenses = {
  sales: 'Relevant means a genuine personal business inquiry or sales prospect. Other means mass promotion, recruiting, receipts, or unrelated mail.',
  jobs: 'Relevant means actual personal application, hiring or recruiter conversation including automated application acknowledgement/rejection. Generic job listings/newsletters are Other.',
  actions: 'Relevant means an explicit request or task requiring action by the mailbox owner. Generic marketing calls to action, informational mail, or already completed work are Other.',
  finance: 'Relevant means a personal invoice, receipt, bill, payment confirmation, failed/declined/returned payment or outstanding amount. Generic financial promotions, offers and investing newsletters are Other. Do not infer payment from invoice creation.',
};
const PAGE_BATCHES = 8;
// Classification never generates or extracts facts with another model. Source-only
// rules supply display metadata; uncertain facts remain unknown.
function sourceCard(c, tab, decision, now) {
  const text=c.messages.at(-1)?.text || '', quote=text.slice(0,180);
  const closed=tab==='jobs' && !c.outbound && !/\b(if|might|may|unless|possibly)\b/i.test(quote) && /(?:not (?:be )?(?:proceeding|moving forward|selected)|rejected|rejection|withdrawn|position.{0,30}(?:filled|closed)|application.{0,30}(?:unsuccessful|closed))/i.test(quote);
  const paymentFailure=tab==='finance'?sourcePaymentFailure(c):null;
  const stage=tab==='jobs' ? closed?'Closed':now-new Date(c.lastTouch)>7*86400000?'Inactive':'Open' : tab==='finance' ? paymentFailure?'Payment failures':/\b(?:amount due|balance due|overdue|please pay|payment required)\b/i.test(quote)?'Action required':'Informational' : c.days >= (c.outbound?3:1)?'Hot':'Moderate';
  return {...visible(c,tab,stage),...decision,stage,theme:stage,application:null,finance:null,paymentFailure,dueDate:null,quote:paymentFailure?.quote||quote,
    evidence:[`Subject: ${c.subject}`,`Latest message: ${c.lastTouch}`,`Source excerpt: ${paymentFailure?.quote||quote}`,...[paymentFailure?.amountQuote,paymentFailure?.actionQuote].filter(Boolean)],
    reason:'JEV classified this topic. Displayed text and dates come directly from the stored email; no generated extraction.'};
}

export function createWorkspaceFlow({ googleRequest, firestore, storedList, encrypt, decrypt, seal, unseal }) {
  const progress = new Map(), locks = new Set(), decisions = new Map(), complete = new Map();
  function keep(map, key, value, max = 5000) { if (map.size >= max) map.delete(map.keys().next().value); map.set(key, { value, expires: Date.now() + 15 * 60000 }); }
  function read(map, key) { const found = map.get(key); if (!found || found.expires < Date.now()) { map.delete(key); return null; } return found.value; }
  return {
    async cache(uid,config) {
      const state=await firestore(`${uid}/workspace_fetch_state/shared`);let metadata;try{metadata=JSON.parse(state?.metadata||'null');}catch{}if(!metadata || metadata.uid!==uid)return null;
      const disposed=new Set((await storedList(uid,'mail_dispositions')).filter(i=>['done','notImportant'].includes(i.status)).map(i=>`${i.threadId}:${i.lastMessageId}`)),all=[];
      const refs=metadata.refs||[];for(let offset=0;offset<refs.length;offset+=8)for(const record of await Promise.all(refs.slice(offset,offset+8).map(ref=>firestore(`${uid}/workspace_fetches/${ref.fetch}/batches/${ref.batch}`))))if(record?.payload)all.push(...decrypt(record.payload,config.key));
      const unique=new Map();for(const c of all)if(metadata.versions[c.threadId]===c.lastMessageId && !disposed.has(`${c.threadId}:${c.lastMessageId}`))unique.set(c.threadId,c);
      metadata.exp=Date.now()+3600000;await firestore(`${uid}/workspace_fetches/${metadata.fetch}`,'PATCH',{metadata:JSON.stringify(metadata)});
      const dismissals=await storedList(uid,'workspace_dismissals');
      return {items:[...unique.values()].map(c=>visible(c,'sales')),fetchIds:Object.fromEntries([...workspaceTabs].map(tab=>[tab,seal({uid,tab,fetch:metadata.fetch,exp:metadata.exp},config.sessionSecret)])),fetched:metadata.scanned,fetchComplete:metadata.complete,lastFetchedAt:new Date(metadata.now).toISOString(),shared:true,dismissedByTab:Object.fromEntries([...workspaceTabs].map(tab=>[tab,dismissals.filter(i=>i.tab===tab&&i.status!=='restored').map(i=>`gmail-${i.threadId}`)]))};
    },
    progress(uid, tab) { return read(progress, `${uid}:${tab}`) || { stage: 'idle' }; },
    clear(uid) { for (const map of [progress, decisions, complete]) for (const key of map.keys()) if (key.startsWith(`${uid}:`)) map.delete(key); },
    async run(mode, uid, user, config, body) {
      const tab = body.tab;
      if (!workspaceTabs.has(tab)) throw Object.assign(new Error('Choose a workspace tab.'), { status: 400 });
      const lock = mode==='fetch'?`${uid}:shared-fetch`:`${uid}:${tab}`;
      if (locks.has(lock)) throw Object.assign(new Error('This tab is already processing mail. Wait for the current batch.'), { status: 409 });
      locks.add(lock);
      const started = performance.now(), timing = { gmailMs: 0, modelMs: 0, storeMs: 0, cacheHits: 0,jevMs:0,jevRequests:0,jevThreads:0,geminiMs:0,geminiRequests:0 };
      const activity = { stage: mode === 'fetch' ? 'fetching' : 'classifying', scanned: 0, fetched: 0, classified: 0, batchTotal: null,timings:timing };
      keep(progress, `${uid}:${tab}`, activity, 200);
      let fetchLease,fetchFinished=false,fetchFailed=false;
      try {
        const dismissalRecords=await storedList(uid,'workspace_dismissals');
        const dismissed = new Set(dismissalRecords.filter(item => item.tab === tab && item.status !== 'restored').map(item => `gmail-${item.threadId}`));
        const disposed = new Set((await storedList(uid,'mail_dispositions')).filter(item=>['done','notImportant'].includes(item.status)).map(item=>`${item.threadId}:${item.lastMessageId}`));
        const allowed = item => (mode==='fetch'||!dismissed.has(item.id || `gmail-${item.threadId}`)) && !disposed.has(`${item.threadId}:${item.lastMessageId}`);
        let token = body.cursor ? unseal(body.cursor, config.sessionSecret) : null;
        if (body.cursor && (!token || token.uid !== uid || token.tab !== tab || token.mode !== mode)) throw Object.assign(new Error('Scan expired or belongs to another workspace. Fetch again.'), { status: 400 });
        if (mode === 'fetch') {
          if(token) { const saved=await firestore(`${uid}/workspace_fetches/${token.fetch}`);const continuation=JSON.parse(saved?.cursor || '{}');if(continuation.uid!==uid || continuation.tab!==tab || continuation.page!==token.page)throw Object.assign(new Error('Fetch continuation changed. Start a fresh fetch.'),{status:409});token=continuation; }
          let baseline = null, retained = [];
          if (!token) {
            const state = await firestore(`${uid}/workspace_fetch_state/shared`);
            try { baseline = JSON.parse(state?.metadata || 'null'); } catch { baseline = null; }
            if(!baseline)for(const sharedTab of ['clusters','sales','actions','finance']) {const shared=await firestore(`${uid}/workspace_fetch_state/${sharedTab}`);try{const value=JSON.parse(shared?.metadata || 'null');if(value?.uid===uid && value.complete){baseline={...value,tab:'shared',windowDays:sharedTab==='clusters'?14:7};break;}}catch{}}
            if (baseline?.uid !== uid) baseline=null;
            if (baseline) {
              const refs=baseline.refs || Array.from({length:baseline.batches},(_,batch)=>({fetch:baseline.fetch,batch}));
              const activeRefs=[],cutoff=Date.now()-14*86400000;
              for(let offset=0;offset<refs.length;offset+=8) {
                const records=await Promise.all(refs.slice(offset,offset+8).map(ref=>firestore(`${uid}/workspace_fetches/${ref.fetch}/batches/${ref.batch}`)));
                for(let index=0;index<records.length;index++){const record=records[index];if(record?.payload){const active=decrypt(record.payload,config.key).filter(c=>new Date(c.lastTouch)>=cutoff&&allowed(c)&&(!baseline.versions||baseline.versions[c.threadId]===c.lastMessageId));if(active.length){retained.push(...active);activeRefs.push(refs[offset+index]);}}}
              }
              const unique=new Map();for(const c of retained)if(allowed(c) && (!baseline.versions || baseline.versions[c.threadId]===c.lastMessageId))unique.set(c.threadId,c);
              retained=[...unique.values()];baseline.refs=activeRefs;baseline.versions=Object.fromEntries(retained.map(c=>[c.threadId,c.lastMessageId]));baseline.dates=Object.fromEntries(retained.map(c=>[c.threadId,c.lastTouch]));
            }
          }
          const cursor = token || { uid, tab, mode, now: Date.now(), page: '', scanned: 0, batches: 0, fetch: randomBytes(16).toString('hex'), baseRefs:baseline?.refs || [], versions:baseline?.versions || {},dates:{...baseline?.dates,...Object.fromEntries(retained.map(c=>[c.threadId,c.lastTouch]))}, watermark:baseline?.now || null,phase:baseline?(baseline.windowDays===7?'gap':'recent'):'full' };
          if(!cursor.phase)throw Object.assign(Error('Fetch flow changed. Refresh and fetch the shared mailbox; saved mail is preserved.'),{status:409});
          const leasePath=`${uid}/workspace_fetch_lock/shared`,priorLease=await firestore(leasePath);
          if(Number(priorLease?.activeExpires)>Date.now() || Number(priorLease?.scanExpires)>Date.now()&&priorLease.fetch!==cursor.fetch)throw Object.assign(Error('Your shared mailbox is already fetching in another session. Wait for it to finish.'),{status:409});
          fetchLease=await firestore(leasePath,'PATCH',{fetch:cursor.fetch,activeExpires:String(Date.now()+90000),scanExpires:String(Date.now()+120000)},priorLease?.updateTime||'missing');
          activity.scanned = cursor.scanned;
          const gmailStarted = performance.now();
          let query=workspaceQuery('clusters',cursor.now);
          if(cursor.phase==='gap')query=query.replace(/before:\d+/,`before:${Math.floor((cursor.watermark-7*86400000)/1000)}`);
          else if(cursor.watermark)query=query.replace(/after:\d+/,match=>`after:${Math.max(Number(match.slice(6)),Math.floor(cursor.watermark/1000)-120)}`);
          const listed = await googleRequest(uid, user, config, `https://gmail.googleapis.com/gmail/v1/users/me/threads?${new URLSearchParams({ maxResults: '48', q: query, ...(cursor.page ? { pageToken: cursor.page } : {}) })}`);
          const candidates = []; activity.batchTotal = (listed.threads || []).length;
          for (let offset = 0; offset < activity.batchTotal; offset += 8) {
            const group = await Promise.all(listed.threads.slice(offset, offset + 8).map(async item => workspaceThread(await googleRequest(uid, user, config,
              `https://gmail.googleapis.com/gmail/v1/users/me/threads/${item.id}?format=full`), user.email, cursor.now)));
            candidates.push(...group.filter(Boolean).filter(allowed).filter(c=>cursor.versions[c.threadId]!==c.lastMessageId)); activity.fetched += group.length;
          }
          timing.gmailMs = Math.round(performance.now() - gmailStarted);
          const storeStarted = performance.now();
          // 16 conversations per encrypted document avoids Firestore's 1 MiB limit.
          const chunks = []; for (let i = 0; i < candidates.length; i += 16) chunks.push(candidates.slice(i, i + 16));
          await Promise.all(chunks.map((chunk, i) => firestore(`${uid}/workspace_fetches/${cursor.fetch}/batches/${cursor.batches + i}`, 'PATCH', { payload: encrypt(chunk, config.key) })));
          const scanned = cursor.scanned + candidates.length, batches = cursor.batches + chunks.length;
          const versions={...cursor.versions},dates={...cursor.dates};for(const c of candidates){versions[c.threadId]=c.lastMessageId;dates[c.threadId]=c.lastTouch;}
          const refs=[...cursor.baseRefs,...Array.from({length:batches},(_,batch)=>({fetch:cursor.fetch,batch}))];
          const advanceRecent=cursor.phase==='gap'&&!listed.nextPageToken;
          const metadata = { uid, tab:'shared',windowDays:14, now: cursor.now, fetch: cursor.fetch, batches:refs.length, refs, versions,dates, scanned:Object.keys(versions).length, complete: !listed.nextPageToken&&!advanceRecent, exp: Date.now() + 3600000 };
          const continuation={...cursor,versions,dates,page:listed.nextPageToken || '',phase:advanceRecent?'recent':cursor.phase,batches,scanned,exp:metadata.exp};
          await firestore(`${uid}/workspace_fetches/${cursor.fetch}`, 'PATCH', { metadata: JSON.stringify(metadata),cursor:JSON.stringify(continuation) });
          if(metadata.complete)await firestore(`${uid}/workspace_fetch_state/shared`,'PATCH',{metadata:JSON.stringify(metadata)});
          fetchFinished=metadata.complete;
          timing.storeMs = Math.round(performance.now() - storeStarted); activity.stage = 'ready';
          return { items: [...retained,...candidates].map(c => visible(c, tab)).filter(allowed), scanned:metadata.scanned, fetched:metadata.scanned, newlyFetched:scanned, incremental:Boolean(cursor.watermark), fetchId: seal({uid,tab,fetch:metadata.fetch,exp:metadata.exp}, config.sessionSecret),
            shared:true,lastFetchedAt:new Date(metadata.now).toISOString(),fetchIds:Object.fromEntries([...workspaceTabs].map(t=>[t,seal({uid,tab:t,fetch:metadata.fetch,exp:metadata.exp},config.sessionSecret)])),dismissedByTab:Object.fromEntries([...workspaceTabs].map(t=>[t,dismissalRecords.filter(i=>i.tab===t&&i.status!=='restored').map(i=>`gmail-${i.threadId}`)])),
            fetchComplete: metadata.complete, complete: metadata.complete, themes: [], nextCursor: listed.nextPageToken || advanceRecent ? seal({uid,tab,mode,fetch:cursor.fetch,page:continuation.page,exp:metadata.exp}, config.sessionSecret) : null,
            generatedAt: new Date().toISOString(), timings: { ...timing, totalMs: Math.round(performance.now() - started) } };
        }
        const fetched = unseal(body.fetchId, config.sessionSecret);
        if (!fetched || fetched.uid !== uid || fetched.tab !== tab || token && token.fetch !== fetched.fetch) throw Object.assign(new Error('Fetch mail in your own workspace first.'), { status: 400 });
        const manifest = await firestore(`${uid}/workspace_fetches/${fetched.fetch}`);
        const metadata = JSON.parse(manifest?.metadata || '{}');
        if (metadata.uid !== uid || ![tab,'shared'].includes(metadata.tab) || metadata.exp < Date.now()) throw Object.assign(new Error('Stored mail expired. Fetch again.'), { status: 400 });
        const eligibleTotal=metadata.dates?Object.entries(metadata.versions).filter(([id,version])=>new Date(metadata.dates[id])>=metadata.now-(tab==='jobs'?180:tab==='clusters'?14:7)*86400000&&!disposed.has(`${id}:${version}`)&&!dismissed.has(`gmail-${id}`)).length:null;activity.eligibleTotal=eligibleTotal;
        const prompt = String(body.prompt || '').slice(0, 3000), signature = hash(prompt);
        if (token && token.promptHash !== signature) throw Object.assign(new Error('Your analysis changed. Start analysis again.'), { status: 400 });
        const scope = `${uid}:${tab}:${signature}:jev-only-v1${tab==='finance'?'-failures-v1':''}:${process.env.CRM_JEV_MODEL || 'jev-latest'}`;
        const snapshotKey = `${scope}:${fetched.fetch}`;
        const statusVersion=await firestore(`${uid}/workspace_meta/status`);
        const durablePath=`${uid}/workspace_analyses/${hash(`${scope}:${JSON.stringify(metadata.versions || fetched.fetch)}:${statusVersion?.updatedAt || ''}`)}`;
        const durable=await firestore(durablePath);
        if(!token && durable?.complete==='true' && Number(durable.expires)>Date.now()) {
          const pages=JSON.parse(durable.pages || '[]'),all=[];
          for(let offset=0;offset<pages.length;offset+=8)for(const record of await Promise.all(pages.slice(offset,offset+8).map(page=>firestore(`${durablePath}/batches/${page}`)))) {
            if(!record?.payload)throw Object.assign(new Error('Saved analysis is incomplete. Fetch again.'),{status:409});all.push(...decrypt(record.payload,config.key));
          }
          const unique=new Map();for(const item of all.filter(allowed))unique.set(item.id,item);
          const savedItems=[...unique.values()];activity.stage='ready';
          timing.storeMs=Math.round(performance.now()-started);
          return {items:tab==='jobs'?mergeJobApplications(savedItems):savedItems,replaceItems:tab==='jobs',themes:JSON.parse(durable.themes || '[]'),scanned:savedItems.length,eligibleTotal,fetched:metadata.scanned,fetchComplete:metadata.complete,complete:true,nextCursor:null,cached:true,generatedAt:durable.generatedAt,timings:{...timing,totalMs:Math.round(performance.now()-started)}};
        }
        const previous = read(complete, snapshotKey);
        if (!token && previous) { activity.stage = 'ready'; return { ...previous, items:previous.items.filter(allowed), cached: true, timings: { ...timing, totalMs: Math.round(performance.now() - started) } }; }
        const cursor = token || { uid, tab, mode, fetch: fetched.fetch, page: 0, scanned: 0, themes: [] };
        activity.scanned = cursor.scanned;
        const candidates = [], storeStarted = performance.now();
        for (let i = Number(cursor.page); i < Math.min(Number(cursor.page) + PAGE_BATCHES, metadata.batches); i++) {
          const ref=metadata.refs?.[i] || {fetch:fetched.fetch,batch:i};
          const batch = await firestore(`${uid}/workspace_fetches/${ref.fetch}/batches/${ref.batch}`);
          if (!batch?.payload) throw Object.assign(new Error('Stored batch is missing. Fetch mail again.'), { status: 409 });
          candidates.push(...decrypt(batch.payload, config.key).filter(allowed).filter(c=>!metadata.versions || metadata.versions[c.threadId]===c.lastMessageId).filter(c=>new Date(c.lastTouch)>=metadata.now-(tab==='jobs'?180:tab==='clusters'?14:7)*86400000));
        }
        timing.storeMs = Math.round(performance.now() - storeStarted); activity.batchTotal = candidates.length;
        let themes = cursor.themes || [], items = []; const modelStarted = performance.now();
        if (tab === 'clusters' && !themes.length) themes = checkedThemes({themes:body.themes}) || [];
        if (tab === 'clusters' && !themes.length) themes = ['Business','Jobs','Tasks','Finance','Personal','Other'];
        const labels = tab === 'clusters' ? themes : ['Relevant', 'Other'];
        await Promise.all(Array.from({length:Math.ceil(candidates.length/16)},(_,i)=>i*16).map(async offset => {
          const group = candidates.slice(offset, offset + 16), missing = [];
          const resolved = new Map();
          for (const c of group) {
            const key = `${scope}:${c.threadId}:${c.lastMessageId}:${hash(JSON.stringify(labels))}`;
            const decision = read(decisions, key);
            if (decision) { resolved.set(c.threadId, decision); timing.cacheHits++; } else missing.push(c);
          }
          const classified = await classifyThemeBatch(missing, labels, { instruction: tab === 'clusters' ? 'Choose the email topic.' : lenses[tab],request:async(...args)=>{const t=performance.now();timing.jevRequests++;timing.jevThreads+=missing.length;try{return await fetch(...args);}finally{timing.jevMs+=Math.round(performance.now()-t);}} });
          for (let i = 0; i < missing.length; i++) { const c = missing[i]; resolved.set(c.threadId, classified[i]); keep(decisions, `${scope}:${c.threadId}:${c.lastMessageId}:${hash(JSON.stringify(labels))}`, classified[i]); }
          for (const c of group) {
            const decision = resolved.get(c.threadId); activity.classified++;
            if (decision.theme === 'Needs review') items.push({ ...visible(c, tab), ...decision, stage: 'Unsorted', theme: 'Unsorted', reviewRequired: true });
            else if (tab === 'clusters') items.push({ ...visible(c, tab, decision.theme), ...decision });
            else if (decision.theme === 'Relevant') items.push(sourceCard(c,tab,decision,metadata.now));
            else items.push({ ...visible(c, tab, 'Other'), ...decision, stage: 'Other', theme: 'Other', nonAction: true });
          }
        }));
        timing.modelMs = Math.round(performance.now() - modelStarted); activity.stage = 'preparing';const writeStarted=performance.now();
        await Promise.all(items.filter(i => !i.nonAction && !i.reviewRequired && tab !== 'clusters').map(async item => {
          const path = `${uid}/gmail_leads/${tab}-${item.id}`, prior = await firestore(path);
          try { const saved=JSON.parse(prior?.lead || 'null');if(saved?.lastMessageId===item.lastMessageId){item.application=saved.application || null;item.finance=saved.finance || null;item.dueDate=saved.dueDate || null;} } catch {}
          if ((!item.paymentFailure || prior?.manualStage==='Payment failures') && (tab === 'finance' ? ['Action required','Informational','Payment failures'] : tab === 'jobs' ? ['Inactive','Closed'] : ['Hot','Moderate','Cold','Done']).includes(prior?.manualStage)) { item.stage = prior.manualStage; item.manualStatus = true; }
          await firestore(path, 'PATCH', { lead: JSON.stringify(item), manualStage: prior?.manualStage || '', analyzedAt: new Date().toISOString() }, prior?.updateTime);
        }));
        const page = Number(cursor.page) + PAGE_BATCHES, scanned = cursor.scanned + candidates.length;
        items = items.filter(allowed);
        const result = { items, themes, scanned,eligibleTotal, fetched: metadata.scanned, fetchComplete: metadata.complete, complete: page >= metadata.batches,
          nextCursor: page < metadata.batches ? seal({ ...cursor, page, scanned, themes, promptHash: signature, exp: metadata.exp }, config.sessionSecret) : null,
          generatedAt: new Date().toISOString(), timings: { ...timing, totalMs: Math.round(performance.now() - started) } };
        const accumulated = read(complete, `${snapshotKey}:partial`) || new Map(); for (const item of items) accumulated.set(item.id, item);
        await firestore(`${durablePath}/batches/${cursor.page}`,'PATCH',{payload:encrypt(items,config.key)});
        // Restore earlier completed batches even if Cloud Run routes to a new instance.
        for(let offset=0;offset<Number(cursor.page);offset+=16) {
          const pages=Array.from({length:Math.ceil((Math.min(offset+16,Number(cursor.page))-offset)/PAGE_BATCHES)},(_,i)=>offset+i*PAGE_BATCHES);
          for(const record of await Promise.all(pages.map(page=>firestore(`${durablePath}/batches/${page}`)))) {
            if(!record?.payload)throw Object.assign(new Error('Earlier analysis batch is missing. Start analysis again.'),{status:409});for(const item of decrypt(record.payload,config.key).filter(allowed))if(!accumulated.has(item.id))accumulated.set(item.id,item);
          }
        }
        if (tab === 'jobs') { result.items = mergeJobApplications([...accumulated.values()], metadata.now); result.replaceItems = true; }
        keep(complete, `${snapshotKey}:partial`, accumulated, 100);
        if (result.complete) { keep(complete, snapshotKey, { ...result, items: tab === 'jobs' ? result.items : [...accumulated.values()] }, 100); complete.delete(`${snapshotKey}:partial`);
          await firestore(durablePath,'PATCH',{complete:'true',pages:JSON.stringify(Array.from({length:Math.max(1,Math.ceil(metadata.batches/PAGE_BATCHES))},(_,i)=>i*PAGE_BATCHES)),themes:JSON.stringify(themes),generatedAt:result.generatedAt,expires:String(Date.now()+15*60000)});
        }
        timing.storeMs+=Math.round(performance.now()-writeStarted);result.timings={...timing,totalMs:Math.round(performance.now()-started)};
        activity.stage = 'ready'; return result;
      } catch (error) { fetchFailed=true;activity.stage = 'paused'; throw error; }
      finally { if(fetchLease)try{await firestore(`${uid}/workspace_fetch_lock/shared`,'PATCH',{fetch:fetchLease.fetch,activeExpires:'0',scanExpires:fetchFinished||fetchFailed?'0':String(Date.now()+120000)},fetchLease.updateTime);}catch{}locks.delete(lock); }
    },
  };
}
