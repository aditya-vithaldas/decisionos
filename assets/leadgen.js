(() => {
  const $ = id => document.getElementById(id);
  let profile = null, results = [], filter = 'all', busy = false;
  const el = (tag, className, content) => { const node = document.createElement(tag); if (className) node.className = className; if (content) node.textContent = content; return node; };
  const link = (label, url) => { const node = el('a', '', label); node.href = url; node.target = '_blank'; node.rel = 'noopener noreferrer'; return node; };
  const status = (message, error = false) => { $('app-status').textContent = message; $('app-status').classList.toggle('error', error); };
  function controls(value) {
    busy = value; $('discover').disabled = value; $('website').disabled = value; $('retry-search').disabled = value;
    $('discover').textContent = value ? 'Finding conversations…' : 'Find conversations ↗';
    $('main').setAttribute('aria-busy', String(value));
  }
  async function api(path, body) {
    const response = await fetch(`/api/leadgen/${path}`, { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not finish. Please try again.');
    return data;
  }
  function attribution(suggestions) {
    $('search-suggestions').replaceChildren(); $('search-attribution').hidden = !suggestions;
    if (!suggestions) return;
    const frame = document.createElement('iframe'); frame.title = 'Google Search suggestions';
    frame.setAttribute('sandbox', 'allow-popups allow-popups-to-escape-sandbox'); frame.referrerPolicy = 'no-referrer'; frame.srcdoc = suggestions;
    $('search-suggestions').append(frame);
  }
  function render() {
    const visible = results.filter(item => filter === 'all' || item.platform === filter);
    $('result-count').textContent = `${visible.length} conversation${visible.length === 1 ? '' : 's'}`;
    $('filters').hidden = !results.length; $('results').replaceChildren();
    if (!visible.length) {
      const empty = el('div', 'empty'); empty.append(el('h3', '', results.length ? 'No conversations on this platform.' : 'No matching questions found this time.'), el('p', '', 'Public search coverage varies. Try again later or try another website.')); $('results').append(empty);
    }
    for (const item of visible) {
      const card = el('article', 'lead-card'); card.dataset.platform = item.platform;
      const top = el('div', 'card-top'); top.append(el('span', '', item.platform), el('span', 'fit', `${item.fit} fit`), el('span', 'status-tag', item.answerStatus === 'unanswered' ? 'Appears unanswered · check original' : 'Reply status unknown'));
      const angle = el('p', 'angle'); angle.append(el('strong', '', 'A helpful angle: '), document.createTextNode(item.angle || 'Read the original question and offer specific, useful advice.'));
      const evidence = el('details'); evidence.append(el('summary', '', 'Why this conversation is here'), el('p', '', `Search summary: ${item.evidence}`));
      if (item.answerEvidence) evidence.append(el('p', '', `Reply-status evidence: ${item.answerEvidence}`));
      evidence.append(link(item.title || 'Original source', item.url));
      const actions = el('div', 'card-actions'); actions.append(link('Open conversation & reply ↗', item.url));
      card.append(top, el('p', 'question-label', 'Question summary'), el('h3', '', item.question), el('p', 'reason', item.reason), angle, evidence, actions); $('results').append(card);
    }
  }
  async function search() {
    status('Finding relevant questions on LinkedIn, X and Reddit…');
    const found = await api('search', { profile, platforms: ['LinkedIn', 'X', 'Reddit'] });
    results = found.results; $('coverage').replaceChildren();
    for (const item of found.coverage || []) $('coverage').append(el('span', '', item.status === 'unavailable' ? `${item.platform}: search unavailable` : `${item.platform}: ${item.count} match${item.count === 1 ? '' : 'es'}`));
    $('inbox').hidden = false; $('retry-search').hidden = true; render(); attribution(found.suggestions);
    status(results.length ? 'Conversations are ready. Open a question and offer something useful.' : 'Search complete. No supported matches found this time.');
  }
  $('website-form').addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    let website = $('website').value.trim(); if (!/^https?:\/\//i.test(website)) website = `https://${website}`;
    try { const url = new URL(website); if (url.protocol !== 'https:') throw new Error(); website = url.href; }
    catch { return status('Enter a public website, such as https://yourcompany.com.', true); }
    controls(true); profile = null; results = []; filter = 'all';
    document.querySelectorAll('[data-filter]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.filter === filter)));
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
    filter = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.filter === filter))); render();
  }));
})();
