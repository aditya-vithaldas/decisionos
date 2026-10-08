(() => {
  const $ = id => document.getElementById(id);
  let account = null, state = { profile: null, results: [] }, filter = 'all', busy = false, example = false;
  const status = (message, error = false) => { $('app-status').textContent = message; $('app-status').classList.toggle('error', error); };
  const el = (tag, className, content) => { const node = document.createElement(tag); if (className) node.className = className; if (content) node.textContent = content; return node; };
  const link = (label, url) => { const a = el('a', '', label); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; };
  async function api(path, body) {
    const response = await fetch(`/crm/api${path}`, { credentials: 'same-origin', ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
    const result = await response.json();
    if (!response.ok) { const error = new Error(result.error || 'Could not complete this request.'); error.code = response.status; throw error; }
    return result;
  }
  function controls() {
    $('recommend').disabled = busy || !account; $('search').disabled = busy || !account;
    $('logout').disabled = busy; $('try-example').disabled = busy;
    for (const node of document.querySelectorAll('.setup input,.setup textarea,.card-actions button')) node.disabled = busy;
    $('recommend').textContent = busy && $('recommend').dataset.active ? 'Researching your company…' : 'Recommend questions ↗';
    $('search').textContent = busy && $('search').dataset.active ? 'Finding conversations…' : 'Find conversations ↗';
  }
  async function perform(button, message, task) {
    if (busy) return;
    if (!account) return status('Sign in with Google to research your company and find conversations.');
    busy = true; button.dataset.active = 'true'; controls(); status(message);
    $('results').setAttribute('aria-busy', 'true');
    try { await task(); } catch (error) {
      status(error.message, true);
      if (error.code === 401) { account = null; accountUI(); }
    } finally { busy = false; delete button.dataset.active; controls(); $('results').removeAttribute('aria-busy'); }
  }
  function accountUI() {
    $('signin').hidden = !!account; $('logout').hidden = !account; $('account').hidden = !account;
    $('account').textContent = account?.name || ''; $('signin-hint').hidden = !!account;
    controls();
  }
  function showProfile() {
    const profile = state.profile; $('profile-section').hidden = !profile;
    if (!profile) return;
    $('company').value = profile.company; $('website').value = profile.website || '';
    $('offering').value = profile.summary; $('questions').value = profile.questions.join('\n');
    $('company-sources').replaceChildren();
    for (const source of state.sources || []) $('company-sources').append(link(source.title || new URL(source.url).hostname, source.url));
  }
  function attribution() {
    $('search-suggestions').replaceChildren(); $('search-attribution').hidden = !state.suggestions;
    if (state.suggestions) {
      const frame = document.createElement('iframe'); frame.title = 'Google Search suggestions';
      frame.setAttribute('sandbox', 'allow-popups allow-popups-to-escape-sandbox'); frame.referrerPolicy = 'no-referrer'; frame.srcdoc = state.suggestions;
      $('search-suggestions').append(frame);
    }
  }
  function render() {
    const all = state.results || [];
    const visible = all.filter(item => filter === 'dismissed' ? item.status === 'dismissed' : item.status !== 'dismissed' && (filter === 'all' || item.platform === filter || item.status === filter));
    $('filters').hidden = !all.length;
    $('result-count').textContent = `${visible.length} conversation${visible.length === 1 ? '' : 's'}`;
    $('search-meta').textContent = state.searchedAt ? `Last searched ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(state.searchedAt))}. Post dates and current buying intent are unverified.` : example ? 'Example recommendations only. Sign in and search to discover actual posts.' : state.profile ? 'Review your offering and questions, then find conversations.' : 'Start with a company to discover relevant questions.';
    $('coverage').replaceChildren();
    for (const item of state.coverage || []) $('coverage').append(el('span', '', item.status === 'unavailable' ? `${item.platform}: search unavailable` : `${item.platform}: ${item.count} match${item.count === 1 ? '' : 'es'}`));
    $('results').replaceChildren();
    if (!visible.length) {
      const empty = el('div', 'empty'); empty.append(el('span', 'empty-icon', '↗'), el('h3', '', state.searchedAt ? all.length ? 'No conversations in this view.' : 'No verified matches this time.' : 'Good leads start with a real need.'), el('p', '', state.searchedAt ? 'Try another question or platform. Public search coverage can be limited; fewer matches are better than invented prospects.' : 'We’ll look for questions about problems you solve, then show you why each conversation could be a fit.'));
      $('results').append(empty);
    }
    for (const item of visible) {
      const card = el('article', 'lead-card'); card.dataset.platform = item.platform;
      const top = el('div', 'card-top'); top.append(el('span', '', item.platform === 'X' ? 'X / Twitter' : item.platform), el('span', 'fit', `${item.fit} fit · suggestion`));
      const reason = el('p', 'reason', item.reason), angle = el('p', 'angle'); angle.append(el('strong', '', 'A helpful angle: '), document.createTextNode(item.angle || 'Read the original question and offer specific, useful advice.'));
      const evidence = el('details'); evidence.append(el('summary', '', 'Why this conversation is here'), el('p', '', `Search summary (not a direct quote): ${item.evidence}`), link(item.title || 'Original source', item.url));
      const actions = el('div', 'card-actions'); actions.append(link('Open conversation & reply ↗', item.url));
      const choices = item.status === 'dismissed' ? [['Restore', 'new']] : [[item.status === 'saved' ? 'Unsave' : 'Save', item.status === 'saved' ? 'new' : 'saved'], [item.status === 'replied' ? 'Undo replied' : 'Mark replied', item.status === 'replied' ? 'new' : 'replied'], ['Dismiss', 'dismissed']];
      for (const [label, nextStatus] of choices) {
        const button = el('button', item.status === 'saved' && nextStatus === 'new' ? 'selected' : '', label); button.type = 'button';
        button.addEventListener('click', () => perform(button, 'Updating this lead…', async () => { state = await api('/leadgen/status', { id: item.id, status: nextStatus }); render(); status(nextStatus === 'replied' ? 'Marked as replied in your workspace.' : 'Lead updated.'); })); actions.append(button);
      }
      if (item.status !== 'new') actions.append(el('span', 'status-tag', item.status));
      card.append(top, el('p', 'question-label', 'Question summary'), el('h3', '', item.question), reason, angle, evidence, actions); $('results').append(card);
    }
    attribution(); controls();
  }
  $('company-form').addEventListener('submit', event => {
    event.preventDefault();
    perform($('recommend'), 'Reading your company’s public website and preparing recommendations…', async () => {
      state = await api('/leadgen/recommend', { company: $('company').value.trim(), website: $('website').value.trim() });
      example = false; filter = 'all'; resetFilters(); showProfile(); render(); status('Recommendations are ready. Check the company and refine the questions before searching.'); $('offering').focus();
    });
  });
  $('search').addEventListener('click', () => {
    if (busy) return;
    const questions = $('questions').value.split('\n').map(q => q.trim()).filter(Boolean);
    if (questions.length > 6 || questions.some(q => q.length > 240)) return status('Use up to six questions, each at most 240 characters.', true);
    perform($('search'), 'Searching public questions and checking their relevance. This can take a couple of minutes…', async () => {
      state = await api('/leadgen/search', { profile: { company: $('company').value.trim(), website: $('website').value.trim(), summary: $('offering').value.trim(), questions }, platforms: [...document.querySelectorAll('.platform-check input:checked')].map(node => node.value) });
      example = false; filter = 'all'; resetFilters(); render(); status(state.results.length ? 'Conversations are ready. Read the original post before replying.' : 'Search finished. No supported buyer questions matched this time.');
    });
  });
  function resetFilters() { document.querySelectorAll('[data-filter]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.filter === filter))); }
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { filter = button.dataset.filter; resetFilters(); render(); }));
  $('try-example').addEventListener('click', () => {
    example = true; filter = 'all'; resetFilters();
    state = { profile: { company: 'Decision Axis', website: 'https://decisionaxis.co', summary: 'Product, design and engineering services for B2B companies, including agent harness setup and making products accessible through ChatGPT.', questions: ['How do I set up an agent harness for my company?', 'Is there a plug-and-play way to connect our team’s tools to AI agents?', 'How can customers use our B2B product from ChatGPT?'] }, results: [], sources: [] };
    showProfile(); render(); status('Illustrative recommendations. Edit these and search after signing in.');
  });
  $('logout').addEventListener('click', async () => {
    try { await api('/logout', {}); account = null; state = { profile: null, results: [] }; example = false; $('company-form').reset(); showProfile(); accountUI(); render(); status('Signed out.'); }
    catch (error) { status(error.message, true); }
  });
  controls();
  (async () => {
    try { account = await api('/me'); accountUI(); state = await api('/leadgen/state'); showProfile(); render(); }
    catch (error) { if (error.code !== 401) status(error.code === 503 ? 'Sign-in is not available in this environment. You can explore the example.' : error.message, true); }
    finally { accountUI(); }
  })();
})();
