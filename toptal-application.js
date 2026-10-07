(() => {
  const slides = [...document.querySelectorAll('.slide')];
  const dots = [...document.querySelectorAll('.progress button')];
  const modal = document.getElementById('liveModal');
  const modalFrame = modal?.querySelector('iframe');
  const closeBtn = modal?.querySelector('.modal-close');

  const previous = document.getElementById('previousSlide');
  const next = document.getElementById('nextSlide');
  const count = document.getElementById('slideCount');
  let current = 0;

  function fitSlide() {
    const slide = slides[current];
    const content = slide.querySelector('.slide-content');
    const scale = window.innerWidth > 1100
      ? Math.min(1, (slide.clientHeight - 32) / content.offsetHeight)
      : 1;
    content.style.setProperty('--slide-scale', scale);
  }

  function showSlide(index, updateHash = true) {
    current = Math.max(0, Math.min(slides.length - 1, index));
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === current);
      slide.hidden = i !== current;
      if (i === current) slide.scrollTop = 0;
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === current);
      if (i === current) dot.setAttribute('aria-current', 'step');
      else dot.removeAttribute('aria-current');
    });
    previous.disabled = current === 0;
    next.disabled = current === slides.length - 1;
    count.textContent = `${current + 1} / ${slides.length}`;
    if (updateHash) history.replaceState(null, '', `#${slides[current].id}`);
    fitSlide();
  }

  previous.addEventListener('click', () => showSlide(current - 1));
  next.addEventListener('click', () => showSlide(current + 1));
  dots.forEach(dot => dot.addEventListener('click', () => {
    showSlide(slides.findIndex(slide => slide.id === dot.dataset.go));
  }));
  function readHash() {
    const index = slides.findIndex(slide => `#${slide.id}` === location.hash);
    showSlide(index < 0 ? 0 : index, false);
  }
  window.addEventListener('hashchange', readHash);
  window.addEventListener('resize', fitSlide);
  document.fonts.ready.then(fitSlide);
  new ResizeObserver(fitSlide).observe(document.querySelector('.brandbar'));
  readHash();

  document.addEventListener('keydown', e => {
    if (modal?.classList.contains('open')) {
      if (e.key === 'Escape') closeModal();
      return;
    }
    if (e.target.closest('input, textarea, select, [contenteditable]')) return;
    if (['ArrowRight', 'PageDown', 'ArrowLeft', 'PageUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      if (e.key === 'Home') showSlide(0);
      else if (e.key === 'End') showSlide(slides.length - 1);
      else showSlide(current + (['ArrowRight', 'PageDown'].includes(e.key) ? 1 : -1));
    }
  });

  let returnFocus;
  function openModal(url){
    if (!modal || !modalFrame) return;
    returnFocus = document.activeElement;
    modalFrame.src = url;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    closeBtn.focus();
  }
  function closeModal(){
    if (!modal || !modalFrame) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    modalFrame.src = 'about:blank';
    document.body.style.overflow='';
    returnFocus?.focus({ preventScroll: true });
  }
  document.querySelectorAll('.livebtn').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.live)));
  closeBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
})();
