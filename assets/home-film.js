(() => {
  const film = document.getElementById('idea-film');
  const toggle = document.querySelector('.film-toggle');
  if (!film || !toggle) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let userPaused = reducedMotion.matches;
  let inView = true;
  const updateLabel = () => {
    toggle.textContent = film.paused ? 'Play animation' : 'Pause animation';
  };
  const syncPlayback = () => {
    if (userPaused || !inView || document.hidden) {
      film.pause();
    } else {
      film.play().catch(updateLabel);
    }
    updateLabel();
  };

  film.controls = false;
  film.muted = true;
  film.autoplay = !reducedMotion.matches;
  toggle.hidden = false;
  film.addEventListener('play', updateLabel);
  film.addEventListener('pause', updateLabel);
  toggle.addEventListener('click', () => {
    userPaused = !film.paused;
    syncPlayback();
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) userPaused = true;
    syncPlayback();
  });
  document.addEventListener('visibilitychange', syncPlayback);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncPlayback();
    });
    observer.observe(film);
  }
  syncPlayback();
})();
