const form = document.querySelector('.contact-form');

if (form) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector('.contact-status');
    button.disabled = true;
    status.hidden = false;
    status.dataset.state = '';
    status.textContent = 'Sending your inquiry…';
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new URLSearchParams(new FormData(form)),
      });
      const result = await response.json();
      if (!response.ok && !result.saved) throw new Error(result.error || 'Please try again shortly.');
      form.reset();
      status.textContent = result.message || 'Thanks — your inquiry has been received.';
    } catch (error) {
      status.dataset.state = 'error';
      status.textContent = error instanceof Error ? error.message : 'Please try again shortly.';
    } finally {
      button.disabled = false;
    }
  });
}
