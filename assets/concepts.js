// Deliberately local, scripted interactions for the draft case studies.
const root = document.querySelector('[data-demo]');
if (root?.dataset.demo === 'commerce') {
  const products = [{id:'lamp',name:'Minimal desk lamp',category:'home',detail:'For a calmer workspace'}, {id:'mug',name:'Ceramic mug',category:'home',detail:'An everyday essential'}, {id:'headphones',name:'Comfort headphones',category:'audio',detail:'Space to focus'}, {id:'tote',name:'Everyday tote',category:'accessories',detail:'Carry the essentials'}];
  const saved = new Set();
  const search = document.querySelector('#product-search');
  const category = document.querySelector('#product-category');
  const grid = document.querySelector('#product-grid');
  function render() {
    const matches = products.filter(p => (category.value === 'all' || p.category === category.value) && (p.name+' '+p.detail).toLowerCase().includes(search.value.toLowerCase().trim()));
    grid.replaceChildren();
    matches.forEach(p => {
      const card = document.createElement('article');card.className='demo-product';
      const tag=document.createElement('span');tag.className='eyebrow';tag.textContent=p.category;
      const title=document.createElement('h4');title.textContent=p.name;
      const detail=document.createElement('p');detail.textContent=p.detail;
      const button=document.createElement('button');button.className='button secondary';button.type='button';button.textContent=saved.has(p.id)?'Saved ✓':'Save to shortlist';button.setAttribute('aria-pressed',String(saved.has(p.id)));
      button.addEventListener('click',()=>{saved.has(p.id)?saved.delete(p.id):saved.add(p.id);button.textContent=saved.has(p.id)?'Saved ✓':'Save to shortlist';button.setAttribute('aria-pressed',String(saved.has(p.id)));document.querySelector('#saved-count').textContent=`${saved.size} saved`;});
      card.append(tag,title,detail,button);grid.append(card);
    });
    document.querySelector('#product-status').textContent=matches.length?`${matches.length} sample products shown`:'No products match. Try another search or category.';
  }
  search.addEventListener('input',render);category.addEventListener('change',render);render();
}
if (root?.dataset.demo === 'paralegal') {
  const docs={scope:['Scope note','Sample source: the team is preparing an initial document pack. Confirm the required files and the person responsible for the next review.'],timeline:['Matter timeline','Sample source: intake is complete; document collection and internal review are the next steps. No dates or client records are connected.'],checklist:['Handoff checklist','Sample source: verify the document list, record any open questions, and identify the next reviewer before handoff.']};
  const reviewed=new Set();const select=document.querySelector('#review-document');const button=document.querySelector('#review-button');
  function render(){const key=select.value;document.querySelector('#review-title').textContent=docs[key][0];document.querySelector('#review-content').textContent=docs[key][1];document.querySelector('#review-state').textContent=reviewed.has(key)?'Reviewed in this sample':'Awaiting human review';button.textContent=reviewed.has(key)?'Undo review':'Mark reviewed';document.querySelector('#review-progress').textContent=`${reviewed.size} of 3 reviewed`;}
  select.addEventListener('change',render);button.addEventListener('click',()=>{reviewed.has(select.value)?reviewed.delete(select.value):reviewed.add(select.value);render();});render();
}
if (root?.dataset.demo === 'employee') {
  const tasks={feedback:{context:'Sample input: users ask where to start, want clearer setup guidance, and have trouble finding the next step.',draft:'Theme: onboarding clarity\n\nUsers need a clearer starting point and a visible next step.\n\nProposed action: test a short setup checklist and a single next-step prompt.\n\nQuestion to validate: can a new user complete the first useful action without help?'},brief:{context:'Sample input: a team wants to help new users complete their first meaningful action.',draft:'Product brief: a clearer first session\n\nProblem: new users struggle to identify the first useful step.\n\nMVP: a short checklist, contextual guidance, and one clear next action.\n\nValidation: observe first-session completion and gather feedback on unclear steps.'},release:{context:'Sample input: a setup checklist and clearer next-step guidance are ready for review.',draft:'Draft release notes\n\nA clearer way to get started\n\n- Follow a short setup checklist.\n- See the next useful action in context.\n- Return to unfinished setup steps.\n\nPlease review wording and verify feature availability before publication.'}};
  const select=document.querySelector('#draft-task'),panel=document.querySelector('#draft-panel'),text=document.querySelector('#draft-content'),approve=document.querySelector('#approve-draft'),status=document.querySelector('#draft-state');
  function reset(){document.querySelector('#task-context').textContent=tasks[select.value].context;panel.hidden=true;text.value='';status.textContent='Ready to draft';approve.disabled=false;approve.textContent='Approve draft';}
  select.addEventListener('change',reset);document.querySelector('#generate-draft').addEventListener('click',()=>{text.value=tasks[select.value].draft;panel.hidden=false;approve.disabled=false;approve.textContent='Approve draft';status.textContent='Draft ready for review';text.focus();});
  text.addEventListener('input',()=>{approve.disabled=!text.value.trim();approve.textContent='Approve draft';status.textContent='Draft edited — review needed';});
  approve.addEventListener('click',()=>{if(!text.value.trim())return;status.textContent='Approved in this sample';approve.disabled=true;approve.textContent='Approved ✓';});reset();
}
