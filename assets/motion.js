// One calm current, shared by all particles. No dependencies or pointer capture.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const mobile = matchMedia('(max-width: 760px)');
const buttons = [...document.querySelectorAll('.motion-toggle')];
let paused = false;
const fields = [...document.querySelectorAll('.swarm-canvas')].map(canvas => {
  const context = canvas.getContext('2d');
  if (!context) return null;
  const field = { canvas, context, width: 0, height: 0, time: 0, frame: 0, last: null, visible: true, x: .5, y: .4, aimX: .5, aimY: .4, influence: 0, aimInfluence: 0 };
  const landing = canvas.closest('.swarm-landing');
  // Three disciplines begin independently, then converge into one smooth current.
  const laneColors = [[32, 77, 255], [95, 101, 114], [23, 25, 31]];
  const names = ['Product', 'Design', 'Engineering'];
  const smooth = u => { const v = Math.max(0, Math.min(1, u)); return v * v * (3 - 2 * v); };
  function point(u, lane, strand, t) {
    const merge = smooth((u - .1) / .75);
    const loose = 1 - merge;
    // Incommensurate waves drift without an obvious repeated loop or frame jitter.
    const phase = lane * 2.37 + strand * .61;
    const wave = Math.sin(u * (11.7 + lane * 1.3) + phase + t * .43)
      + .47 * Math.sin(u * 22.3 - t * .31 + phase * 1.73)
      + .24 * Math.sin(u * 7.1 + t * .67 + phase * 2.19);
    const envelope = Math.sin(Math.PI * Math.min(1, u * 1.6));
    const center = (landing ? (mobile.matches ? .29 : .32) : (mobile.matches ? .35 : .40)) + Math.sin(u * 4 - t * .22) * .017;
    const x = .09 + .82 * u + Math.sin(u * 9 + phase + t * .37) * .007 * loose * envelope;
    const y = center + (lane - 1) * (mobile.matches ? .14 : .16) * loose
      + wave * (mobile.matches ? .028 : .045) * loose * envelope + strand * .005 * loose;
    const distance = ((x - field.x) / .3) ** 2 + ((y - field.y) / .35) ** 2;
    const pull = Math.exp(-distance) * field.influence * Math.sin(Math.PI * u) * .48;
    return [field.width * (x + (field.x - x) * pull * .35),
      field.height * (y + (field.y - y) * pull)];
  }
  function draw() {
    const { width: w, height: h, time: t, context: ctx } = field;
    ctx.clearRect(0, 0, w, h);
    if (!w || !h) return;
    ctx.lineCap = 'round';
    const strands = mobile.matches ? 3 : 5;
    for (let lane = 0; lane < 3; lane++) {
      const color = laneColors[lane];
      // Fine continuous paths retain meaning even when motion is paused.
      for (let strand = 0; strand < strands; strand++) {
        const offset = strand - (strands - 1) / 2;
        ctx.beginPath();
        for (let i = 0; i <= 90; i++) {
          const [x, y] = point(i / 90, lane, offset, t);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${color.join(',')},${strand === 0 ? .2 : .095})`;
        ctx.lineWidth = strand === 0 ? 1.3 : .8;
        ctx.stroke();
      }
      // Traveling marks follow the same paths, never random orbits.
      const count = mobile.matches ? 14 : 25;
      for (let i = 0; i < count; i++) {
        const u = (i / count + Math.sin(i * 13.7 + lane) * .009 + t * (.03 + lane * .002) + lane * .013 + 1) % 1;
        const merge = smooth((u - .1) / .75);
        const strand = Math.sin(i * 2.4 + lane) * 1.8;
        const [x, y] = point(u, lane, strand, t);
        const [nextX, nextY] = point(Math.min(1, u + .009), lane, strand, t);
        const rgb = color.map((c, j) => Math.round(c + (laneColors[0][j] - c) * merge));
        const fade = Math.min(1, u * 15, (1 - u) * 15);
        ctx.strokeStyle = `rgba(${rgb.join(',')},${fade * (.4 + merge * .3)})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nextX, nextY); ctx.stroke();
      }
      const label = point(0, lane, 0, t);
      ctx.font = `${mobile.matches ? 11 : 12}px Helvetica, Arial, sans-serif`;
      ctx.fillStyle = '#5f6572';
      ctx.fillText(names[lane], label[0], label[1] - 17);
    }
    // A soft, stable destination signals alignment without a flashy pulse.
    const end = point(.97, 1, 0, t);
    const glow = ctx.createRadialGradient(end[0], end[1], 0, end[0], end[1], w * .13);
    glow.addColorStop(0, 'rgba(32,77,255,.09)');
    glow.addColorStop(1, 'rgba(32,77,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(end[0], end[1], w * .13, 0, Math.PI * 2); ctx.fill();
  }
  function allowed() { return !paused && !reduced.matches && !document.hidden && field.visible; }
  function tick(now) {
    field.frame = 0;
    if (!allowed()) { field.last = null; return; }
    if (field.last === null) field.last = now;
    const delta = now - field.last;
    if (delta >= 1000 / 30) {
      field.time += Math.min(delta, 70) / 1000;
      field.last = now;
      field.x += (field.aimX - field.x) * .075;
      field.y += (field.aimY - field.y) * .075;
      field.influence += (field.aimInfluence - field.influence) * .065;
      draw();
    }
    field.frame = requestAnimationFrame(tick);
  }
  field.sync = () => {
    cancelAnimationFrame(field.frame);
    field.frame = 0;
    field.last = null;
    if (reduced.matches) { field.influence = field.aimInfluence = 0; }
    draw();
    if (allowed()) field.frame = requestAnimationFrame(tick);
  };
  const resize = new ResizeObserver(() => {
    const rect = canvas.getBoundingClientRect();
    field.width = rect.width; field.height = rect.height;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    field.sync();
  });
  resize.observe(canvas);
  const observer = new IntersectionObserver(([entry]) => {
    field.visible = entry.isIntersecting;
    field.sync();
  });
  observer.observe(canvas);
  return field;
}).filter(Boolean);
function syncAll() {
  const stopped = paused || reduced.matches;
  buttons.forEach(button => {
    button.textContent = reduced.matches ? 'Reduced motion' : paused ? 'Resume motion' : 'Pause motion';
    button.setAttribute('aria-pressed', String(stopped));
    button.disabled = reduced.matches;
  });
  fields.forEach(field => field.sync());
}
buttons.forEach(button => button.addEventListener('click', () => { paused = !paused; syncAll(); }));
document.addEventListener('pointermove', event => {
  if (!finePointer.matches || reduced.matches || paused || mobile.matches) return;
  fields.forEach(field => {
    const rect = field.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    field.aimInfluence = x >= 0 && x <= 1 && y >= 0 && y <= 1 ? 1 : 0;
    if (field.aimInfluence) { field.aimX = x; field.aimY = y; }
  });
}, { passive: true });
function release() { fields.forEach(field => { field.aimInfluence = 0; }); }
document.documentElement.addEventListener('pointerleave', release);
window.addEventListener('blur', release);
document.addEventListener('visibilitychange', syncAll);
reduced.addEventListener('change', syncAll);
finePointer.addEventListener('change', () => { release(); syncAll(); });
mobile.addEventListener('change', () => { release(); syncAll(); });
syncAll();
