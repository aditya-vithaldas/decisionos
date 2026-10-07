document.querySelectorAll('.service-carousel').forEach(carousel => {
  const section = carousel.closest('section');
  const previous = section?.querySelector('[data-carousel-prev]');
  const next = section?.querySelector('[data-carousel-next]');
  if (!previous || !next) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const cards = [...carousel.querySelectorAll('.service-row')];
  const updateButtons = () => {
    previous.disabled = carousel.scrollLeft <= 2;
    next.disabled = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 2;
  };
  const move = direction => {
    if (!cards.length) return;
    const current = cards.reduce((best, card, index) =>
      Math.abs(card.offsetLeft - cards[0].offsetLeft - carousel.scrollLeft) < Math.abs(cards[best].offsetLeft - cards[0].offsetLeft - carousel.scrollLeft) ? index : best, 0);
    const target = cards[Math.max(0, Math.min(cards.length - 1, current + direction))];
    carousel.scrollTo({ left: target.offsetLeft - cards[0].offsetLeft, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  };
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  carousel.addEventListener('keydown', event => {
    if (event.target !== carousel || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    move(event.key === 'ArrowRight' ? 1 : -1);
  });
  carousel.addEventListener('scroll', updateButtons, { passive: true });
  new ResizeObserver(updateButtons).observe(carousel);
  updateButtons();
});
