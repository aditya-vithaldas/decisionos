(() => {
  const slides = [...document.querySelectorAll('.slide')];
  const dots = [...document.querySelectorAll('.progress button')];
  const modal = document.getElementById('liveModal');
  const modalFrame = modal?.querySelector('iframe');
  const closeBtn = modal?.querySelector('.modal-close');

  const setActive = (id) => {
    slides.forEach(s => s.classList.toggle('is-active', s.id === id));
    dots.forEach(d => d.classList.toggle('active', d.dataset.go === id));
  };

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(e => e.isIntersecting)
      .sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) setActive(visible.target.id);
  }, { threshold: [0.45, 0.65, 0.85] });
  slides.forEach(s => observer.observe(s));

  dots.forEach(d => d.addEventListener('click', () => {
    document.getElementById(d.dataset.go)?.scrollIntoView({behavior:'smooth'});
  }));

  document.addEventListener('keydown', e => {
    if (modal?.classList.contains('open')) {
      if (e.key === 'Escape') closeModal();
      return;
    }
    if (!['ArrowDown','ArrowRight','PageDown','ArrowUp','ArrowLeft','PageUp'].includes(e.key)) return;
    const current = slides.findIndex(s => s.classList.contains('is-active'));
    const forward = ['ArrowDown','ArrowRight','PageDown'].includes(e.key);
    const next = Math.min(slides.length-1, Math.max(0, current + (forward ? 1 : -1)));
    if (next !== current) { e.preventDefault(); slides[next].scrollIntoView({behavior:'smooth'}); }
  });

  function openModal(url){
    if (!modal || !modalFrame) return;
    modalFrame.src = url;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
  }
  function closeModal(){
    if (!modal || !modalFrame) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    modalFrame.src = 'about:blank';
    document.body.style.overflow='';
  }
  document.querySelectorAll('.livebtn').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.live)));
  closeBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
})();
