(() => {
  const $ = id => document.getElementById(id);
  let profile = null, results = [], coverage = [], filter = 'X', busy = false;
  let activityTimer = null, startedAt = 0;
  const el = (tag, className, content) => { const node = document.createElement(tag); if (className) node.className = className; if (content) node.textContent = content; return node; };
  const link = (label, url) => { const node = el('a', '', label); node.href = url; node.target = '_blank'; node.rel = 'noopener noreferrer'; return node; };
  const status = (message, error = false) => { $('app-status').textContent = message; $('app-status').classList.toggle('error', error); };
  function controls(value) {
    busy = value; $('discover').disabled = value; $('website').disabled = value; $('retry-search').disabled = value;
    $('discover').textContent = value ? 'Finding conversations…' : 'Find conversations ↗';
    $('discover').setAttribute('aria-busy', String(value));
    $('inbox').setAttribute('aria-busy', String(value));
    if (!value) { clearInterval(activityTimer); activityTimer = null; $('search-progress').hidden = true; }
  }
  function activity(stage) {
    if (!activityTimer) {
      startedAt = Date.now();
      const tick = () => {
        const seconds = Math.floor((Date.now() - startedAt) / 1000);
        $('progress-time').textContent = `Working · ${seconds}s elapsed`;
        if (seconds >= 420) $('progress-estimate').textContent = 'Taking longer than estimated · still working';
      };
      tick(); activityTimer = setInterval(tick, 1000);
    }
    const stages = ['website', 'questions', 'search', 'review'];
    const index = stages.indexOf(stage);
    if (index < 0) return;
    $('search-progress').hidden = false;
    $('progress-title').textContent = ['Reading your website', 'Choosing question themes', 'Searching LinkedIn, X and Reddit', 'Checking relevance and reply status'][index];
    $('progress-stage').textContent = `Step ${index + 1} of 4`;
    $('discover').textContent = ['Reading website…', 'Choosing themes…', 'Searching conversations…', 'Checking fit…'][index];
    ['progress-read', 'progress-questions', 'progress-find', 'progress-review'].forEach((id, i) => {
      $(id).classList.toggle('complete', i < index); $(id).removeAttribute('aria-current');
      if (i === index) $(id).setAttribute('aria-current', 'step');
    });
    $('progress-note').textContent = ['Learning what your business can help with.', 'Turning your expertise into questions people ask.', 'Looking for a real need, not just a mention.', 'Keeping useful questions; filtering out promotions.'][index];
    $('platform-activity').hidden = index < 2;
  }
  function progress(event) {
    if (event.platform) {
      const chip = [...$('platform-activity').children].find(node => node.dataset.platform === event.platform);
      if (chip) { chip.dataset.state = event.status; chip.textContent = `${event.platform} · ${event.status === 'done' ? `${event.sourceCount} sources found` : event.status === 'unavailable' ? 'Unavailable' : event.status === 'expanding' ? 'Broadening search' : event.status === 'limited' ? 'Coverage limited' : 'Searching'}`; }
      return;
    }
    activity(event.stage);
    $('progress-detail').textContent = event.detail || '';
    $('progress-estimate').textContent = `Estimated 2–7 minutes overall${event.estimate ? ` · ${event.estimate}` : ''}`;
  }
  async function api(path, body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 330000);
    try {
      const response = await fetch(`/api/leadgen/${path}`, { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, progress: true }), signal: controller.signal });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/x-ndjson')) {
        const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not finish. Please try again.'); return data;
      }
      const reader = response.body.getReader(), decoder = new TextDecoder(); let pending = '', result;
      const consume = line => {
        if (!line.trim()) return;
        const event = JSON.parse(line);
        if (event.type === 'stage') progress(event);
        if (event.type === 'error') throw new Error(event.error);
        if (event.type === 'result') result = event.data;
      };
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { pending += decoder.decode(); consume(pending); break; }
          pending += decoder.decode(value, { stream: true });
          if (pending.length > 200000) throw new Error('The response was too large. Please try again.');
          const lines = pending.split('\n'); pending = lines.pop(); for (const line of lines) consume(line);
        }
      } finally { await reader.cancel().catch(() => {}); }
      if (!result) throw new Error('The connection ended before the search finished. Please try again.');
      return result;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('The search took too long. Please try again.');
      throw error;
    } finally { clearTimeout(timeout); }
  }
  function attribution(suggestions) {
    $('search-suggestions').replaceChildren(); $('search-attribution').hidden = !suggestions;
    if (!suggestions) return;
    const frame = document.createElement('iframe'); frame.title = 'Google Search suggestions';
    frame.setAttribute('sandbox', 'allow-popups allow-popups-to-escape-sandbox'); frame.referrerPolicy = 'no-referrer'; frame.srcdoc = suggestions;
    $('search-suggestions').append(frame);
  }
  function render() {
    const visible = results.filter(item => item.platform === filter);
    $('result-count').textContent = `${visible.length} conversation${visible.length === 1 ? '' : 's'}`;
    $('filters').hidden = false;
    document.querySelectorAll('[data-filter]').forEach(button => {
      const selected = button.dataset.filter === filter;
      button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
      button.textContent = `${button.dataset.filter} (${results.filter(item => item.platform === button.dataset.filter).length})`;
      if (selected) $('results').setAttribute('aria-labelledby', button.id);
    });
    $('results').replaceChildren();
    if (!visible.length) {
      const unavailable = coverage.find(item => item.platform === filter)?.status === 'unavailable';
      const empty = el('div', 'empty'); empty.append(el('h3', '', unavailable ? `${filter} search could not finish.` : `No verified recent questions on ${filter}.`), el('p', '', unavailable ? 'Try the search again. The other tabs may have results.' : 'Public web search found no supported questions from the last 30 days. Check another tab or try again later.')); $('results').append(empty);
    }
    for (const item of visible) {
      const card = el('article', 'lead-card'); card.dataset.platform = item.platform;
      const top = el('div', 'card-top'); top.append(el('span', '', item.platform), el('span', 'fit', `${item.fit} fit`), el('span', 'status-tag', item.answerStatus === 'unanswered' ? 'Appears unanswered · check original' : 'Reply status unknown'));
      if (item.postedAt) { const time = el('time', 'post-date', `Posted ${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(item.postedAt + 'T00:00:00Z'))}`); time.dateTime = item.postedAt; top.append(time); }
      const angle = el('p', 'angle'); angle.append(el('strong', '', 'A helpful angle: '), document.createTextNode(item.angle || 'Read the original question and offer specific, useful advice.'));
      const evidence = el('details'); evidence.append(el('summary', '', 'Why this conversation is here'), el('p', '', `Search summary: ${item.evidence}`));
      if (item.dateEvidence) evidence.append(el('p', '', `Posting-date evidence: ${item.dateEvidence}`));
      if (item.answerEvidence) evidence.append(el('p', '', `Reply-status evidence: ${item.answerEvidence}`));
      evidence.append(link(item.title || 'Original source', item.url));
      const actions = el('div', 'card-actions'); actions.append(link('Open conversation & reply ↗', item.url));
      card.append(top, el('p', 'question-label', 'Question summary'), el('h3', '', item.question), el('p', 'reason', item.reason), angle, evidence, actions); $('results').append(card);
    }
  }
  async function search() {
    $('platform-activity').replaceChildren();
    for (const platform of ['LinkedIn', 'X', 'Reddit']) { const chip = el('span', '', `${platform} · Searching`); chip.dataset.platform = platform; chip.dataset.state = 'searching'; $('platform-activity').append(chip); }
    activity('search');
    status('Finding relevant questions on LinkedIn, X and Reddit…');
    const found = await api('search', { profile, platforms: ['LinkedIn', 'X', 'Reddit'] });
    results = found.results; coverage = found.coverage || []; filter = ['X', 'LinkedIn', 'Reddit'].find(platform => results.some(item => item.platform === platform)) || 'X'; $('coverage').replaceChildren();
    for (const item of found.coverage || []) $('coverage').append(el('span', '', item.status === 'unavailable' ? `${item.platform}: search unavailable` : `${item.platform}: ${item.count}/10 recent matches${item.status === 'limited' ? ' · search limited' : ''}`));
    $('inbox').hidden = false; $('retry-search').hidden = true; render(); attribution(found.suggestions);
    status(results.length ? 'Recent conversations are ready. Newest first; each tab aims for 8–10 verified posts.' : 'Search complete. No supported matches found this time.');
  }
  $('website-form').addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    let website = $('website').value.trim(); if (!/^https?:\/\//i.test(website)) website = `https://${website}`;
    try { const url = new URL(website); if (url.protocol !== 'https:') throw new Error(); website = url.href; }
    catch { return status('Enter a public website, such as https://yourcompany.com.', true); }
    controls(true); profile = null; results = []; filter = 'X';
    activity('website');
    $('progress-detail').textContent = `Checking ${new URL(website).hostname}.`;
    $('progress-estimate').textContent = 'Estimated 2–7 minutes overall';
    $('question-plan').hidden = true; $('inbox').hidden = true; $('retry-search').hidden = true; attribution('');
    status('Reading your website and finding the questions your business can answer…');
    try {
      const recommendation = await api('recommend', { website }); profile = recommendation.profile;
      $('company-summary').textContent = profile.summary; $('recommended-questions').replaceChildren(); $('company-sources').replaceChildren();
      for (const question of profile.questions) $('recommended-questions').append(el('li', '', question));
      for (const source of recommendation.sources || []) $('company-sources').append(link(source.title || new URL(source.url).hostname, source.url));
      $('question-plan').hidden = false; attribution(recommendation.suggestions); await search();
    } catch (error) { status(error.message, true); $('retry-search').hidden = !profile; }
    finally { controls(false); }
  });
  $('retry-search').addEventListener('click', async () => {
    if (busy || !profile) return; controls(true);
    try { await search(); } catch (error) { status(error.message, true); } finally { controls(false); }
  });
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.filter; render();
  }));
  $('filters').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tabs = [...$('filters').querySelectorAll('[role=tab]')]; const index = tabs.indexOf(document.activeElement);
    if (index < 0) return; event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].click(); tabs[next].focus();
  });
})();
