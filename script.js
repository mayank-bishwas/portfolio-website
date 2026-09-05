// Ported from the Claude Design export's React-based Component class to plain DOM
// manipulation — no React/runtime dependency needed since it never rendered JSX,
// only mutated element styles from refs. Math and timing are unchanged.
document.addEventListener('DOMContentLoaded', () => {
  // Export defaults (data-props): grainOpacity 0.5, glowStrength 1, carouselSeconds 104.
  // The export never overrides these, so they're fixed constants here.
  const GRAIN_OPACITY = 0.5;
  const GLOW_STRENGTH = 1;
  const CAROUSEL_SECONDS = 104;

  const stage = document.getElementById('stage');
  const track = document.getElementById('card-track');
  const grain = document.getElementById('grain');
  const object = document.getElementById('object');
  const objectArt = stage ? stage.querySelector('.object-art') : null;

  if (!stage || !track) return;

  if (grain) grain.style.opacity = String(GRAIN_OPACITY);
  if (objectArt) {
    objectArt.style.filter =
      'saturate(1.12) contrast(1.05) drop-shadow(0 0 ' + (14 * GLOW_STRENGTH) + 'px rgba(227,223,162,' + Math.min(0.9, 0.58 * GLOW_STRENGTH) + ')) ' +
      'drop-shadow(0 0 ' + (50 * GLOW_STRENGTH) + 'px rgba(174,178,164,' + Math.min(0.9, 0.55 * GLOW_STRENGTH) + '))';
  }

  const cards = Array.from(track.querySelectorAll('[data-card]'));
  let paused = false;
  let hovered = null;
  cards.forEach((c) => {
    c.addEventListener('mouseenter', () => { paused = true; hovered = c; });
    c.addEventListener('mouseleave', () => { paused = false; if (hovered === c) hovered = null; });
  });

  let target = { x: 0, y: 0 };
  let cur = { x: 0, y: 0 };
  let phase = 0;
  let last = 0;

  stage.addEventListener('mousemove', (e) => {
    const r = stage.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    target = { x: -nx * 13, y: -ny * 9 }; // counter to the cursor, half the previous travel
  });
  stage.addEventListener('mouseleave', () => { target = { x: 0, y: 0 }; });

  // Drag-to-scrub the carousel (mouse + touch, via Pointer Events). Dragging pauses the
  // autoplay for the duration of the drag and hands control back to it on release, same
  // as hovering a card. A drag past a small threshold suppresses the click-through on the
  // card link it started on, so a swipe doesn't also navigate.
  const DRAG_RANGE = 550; // stage px of drag to sweep one full loop — tuned so the carousel tracks the cursor directly rather than crawling
  let dragging = false;
  let dragStartX = 0;
  let dragStartPhase = 0;
  let dragMoved = false;

  let dragPointerId = null;

  track.addEventListener('pointerdown', (e) => {
    dragging = true;
    dragMoved = false;
    dragStartX = e.clientX;
    dragStartPhase = phase;
    dragPointerId = e.pointerId;
    paused = true;
    // Pointer capture is NOT taken here. Capturing on every pointerdown — even a plain click —
    // can cause the browser to retarget the mouse-compatibility click event to a different
    // element (observed: the click firing on <html> instead of the actual card link, silently
    // killing navigation on real hardware clicks while leaving right-click "open in new tab"
    // unaffected, since that doesn't go through the click/capture path). Capture is deferred
    // below until real dragging is confirmed, so an ordinary click is never touched by it.
  });

  track.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    if (!dragMoved && Math.abs(e.clientX - dragStartX) > 12) {
      dragMoved = true;
      document.body.classList.add('is-dragging-carousel');
      try { track.setPointerCapture(dragPointerId); } catch (err) {}
    }
    if (!dragMoved) return; // still just a stationary press — don't scrub the carousel yet
    const stageScale = stage.getBoundingClientRect().width / 1600; // undo the responsive scale() on #stage
    const deltaX = (e.clientX - dragStartX) / (stageScale || 1);
    phase = (((dragStartPhase + deltaX / DRAG_RANGE) % 1) + 1) % 1;
    layoutCards();
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    paused = false;
    document.body.classList.remove('is-dragging-carousel');
    if (dragMoved) {
      const suppressClick = (ev) => { ev.preventDefault(); };
      track.addEventListener('click', suppressClick, { capture: true, once: true });
    }
  }
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);

  function fit() {
    const host = stage.parentElement;
    const w = window.innerWidth || (host && host.clientWidth) || document.documentElement.clientWidth;
    const h = window.innerHeight || (host && host.clientHeight) || document.documentElement.clientHeight;
    if (!w || !h) return;
    const s = Math.min(w / 1600, h / 1040);
    if (!(s > 0)) return;
    stage.style.transform = 'scale(' + s + ')';
  }

  // 7 cards ride one continuous loop: centre card faces front, edges turn away and recede.
  function layoutCards() {
    const n = cards.length;
    const R = 670, THETA = 45; // flatter arc: the end cards stay wide enough to read
    // The path runs wider than the visible arc (|u| > 1 is off-stage), which puts the 7 slots
    // exactly 6 apart across the stage: one card fades in at the left as another fades out at
    // the right, and every wrap happens off-stage at zero opacity — no visible jump possible.
    const L = 2.05; // barely wider than the stage, so all 7 slots sit on screen with tight gaps

    for (let i = 0; i < n; i++) {
      const el = cards[i];
      const u = ((i / n + phase) % 1) * L - L / 2;
      const a = Math.abs(u);
      // dissolve only in the final sliver before the wrap, so all 7 slots stay on stage
      const k = Math.min(1, Math.max(0, (L / 2 - a) / 0.09));
      const op = Math.max(0, 1 - Math.pow(Math.min(a, 1), 2.4) * 0.25) * (k * k * (3 - 2 * k));
      if (op <= 0.002) { el.style.opacity = '0'; el.style.pointerEvents = 'none'; continue; }
      // convex fan: a card left of centre turns its LEFT edge away, right of centre its RIGHT edge
      const deg = u * THETA;
      const th = deg * Math.PI / 180;
      const lift = (hovered === el ? -10 : 0) - a * 6;
      el.style.transform =
        'translate3d(' + (R * Math.sin(th)).toFixed(2) + 'px,' + lift.toFixed(1) + 'px,' + (R * (Math.cos(th) - 1)).toFixed(1) + 'px) ' +
        'rotateY(' + deg.toFixed(2) + 'deg)';
      el.style.opacity = op.toFixed(3);
      el.style.pointerEvents = op > 0.12 ? 'auto' : 'none'; // clickable at the ends too, once visible
      el.style.zIndex = String(Math.round(100 - a * 60));
      el.style.transition = 'opacity 320ms linear';
    }
  }

  fit();
  window.addEventListener('resize', fit);
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => fit());
    ro.observe(document.documentElement);
    if (stage.parentElement) ro.observe(stage.parentElement);
  }
  document.addEventListener('visibilitychange', layoutCards);

  if (object) object.style.transform = 'translate3d(0,0,0)';
  layoutCards();

  function tick(t) {
    const dt = last ? Math.min(64, t - last) : 16;
    if (!last) fit();
    last = t;

    cur.x += (target.x - cur.x) * 0.06;
    cur.y += (target.y - cur.y) * 0.06;
    if (object) object.style.transform = 'translate3d(' + cur.x.toFixed(2) + 'px,' + cur.y.toFixed(2) + 'px,0)';

    const period = CAROUSEL_SECONDS * 1000;
    if (!paused) phase = (phase + dt / period) % 1;
    layoutCards();

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
});
