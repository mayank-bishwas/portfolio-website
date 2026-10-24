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

  // ==========================================================
  // Mobile Showcase Interactivity (Active on mobile devices)
  // ==========================================================
  // Mobile Showcase Interactivity (Tinder-style swipe & auto-cycle)
  // ==========================================================
  const stackDeck = document.getElementById('mobile-card-stack');
  if (stackDeck) {
    const stackCards = Array.from(stackDeck.querySelectorAll('.m-stack-card'));
    const catButtons = Array.from(document.querySelectorAll('.mobile-cat-btn'));
    const TOTAL_CARDS = stackCards.length;

    let currentMobileIndex = 0;
    let autoCycleTimer = null;
    const AUTO_INTERVAL = 4500;
    let isInteracting = false;
    let hasSwiped = false;

    function getFrontCard() {
      return stackCards[currentMobileIndex];
    }

    function updateStackPositions(activeIndex, animateShuffle = true, direction = 'next') {
      if (activeIndex < 0 || activeIndex >= TOTAL_CARDS) return;
      const oldIndex = currentMobileIndex;
      currentMobileIndex = activeIndex;

      const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Update vertical navigation category items
      catButtons.forEach((btn, idx) => {
        btn.classList.toggle('active', idx === activeIndex);
      });

      if (!animateShuffle || prefersReducedMotion || oldIndex === activeIndex) {
        stackCards.forEach((card, idx) => {
          card.classList.remove('is-shuffling-out', 'is-shuffling-prev');
          card.style.transition = '';
          card.style.transform = '';
          card.style.opacity = '';
          const rel = (idx - activeIndex + TOTAL_CARDS) % TOTAL_CARDS;
          card.setAttribute('data-rel', rel);
        });
        return;
      }

      // Physical Card Shuffle: peel top card away in direction of motion
      const outgoingCard = stackCards[oldIndex];
      if (outgoingCard) {
        outgoingCard.classList.remove('is-shuffling-out', 'is-shuffling-prev');
        outgoingCard.classList.add(direction === 'prev' ? 'is-shuffling-prev' : 'is-shuffling-out');
      }

      // Under-cards glide forward into their new order
      stackCards.forEach((card, idx) => {
        if (idx !== oldIndex) {
          card.classList.remove('is-shuffling-out', 'is-shuffling-prev');
          card.style.transition = '';
          card.style.transform = '';
          card.style.opacity = '';
          const rel = (idx - activeIndex + TOTAL_CARDS) % TOTAL_CARDS;
          card.setAttribute('data-rel', rel);
        }
      });

      // Once peeled, outgoing card tucks behind the deck into its new relative position
      setTimeout(() => {
        if (outgoingCard) {
          outgoingCard.classList.remove('is-shuffling-out', 'is-shuffling-prev');
          outgoingCard.style.transition = '';
          outgoingCard.style.transform = '';
          outgoingCard.style.opacity = '';
          const rel = (oldIndex - activeIndex + TOTAL_CARDS) % TOTAL_CARDS;
          outgoingCard.setAttribute('data-rel', rel);
        }
      }, 190);
    }

    // Method A: Category link selection (clicking/tapping opens the page)
    catButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const href = btn.getAttribute('href');
        if (href) {
          window.location.href = href;
        } else {
          const idx = parseInt(btn.getAttribute('data-index'), 10);
          const dir = idx < currentMobileIndex ? 'prev' : 'next';
          updateStackPositions(idx, true, dir);
          resetAutoTimer();
        }
      });
    });

    // Auto-cycle functions
    function startAutoTimer() {
      if (!autoCycleTimer && !isInteracting) {
        autoCycleTimer = setInterval(() => {
          if (window.innerWidth <= 768 && !isInteracting) {
            const nextIdx = (currentMobileIndex + 1) % TOTAL_CARDS;
            updateStackPositions(nextIdx, true, 'next');
          }
        }, AUTO_INTERVAL);
      }
    }

    function pauseAutoTimer() {
      if (autoCycleTimer) {
        clearInterval(autoCycleTimer);
        autoCycleTimer = null;
      }
    }

    function resetAutoTimer() {
      pauseAutoTimer();
      startAutoTimer();
    }

    // Method B: Tinder-style tactile swipe and hold-to-pause
    let startX = 0;
    let startY = 0;
    let deltaX = 0;
    let deltaY = 0;
    let isDragging = false;
    let activeCard = null;

    function handleStart(clientX, clientY) {
      if (window.innerWidth > 768) return;
      isInteracting = true;
      pauseAutoTimer(); // Pause auto-change immediately on touch / hold

      startX = clientX;
      startY = clientY;
      deltaX = 0;
      deltaY = 0;
      isDragging = false;
      hasSwiped = false;

      activeCard = getFrontCard();
      if (activeCard) {
        activeCard.style.transition = 'none';
      }
    }

    function handleMove(clientX, clientY, e) {
      if (!isInteracting || !activeCard) return;

      deltaX = clientX - startX;
      deltaY = clientY - startY;

      if (!isDragging) {
        // Detect horizontal swipe intent (only when movement is distinctly horizontal > 12px)
        if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY) * 0.8) {
          isDragging = true;
        } else if (Math.abs(deltaY) > 16) {
          // Vertical page scroll detected — cancel card drag
          isInteracting = false;
          if (activeCard) {
            activeCard.style.transition = '';
            activeCard.style.transform = '';
          }
          resetAutoTimer();
          return;
        }
      }

      if (isDragging) {
        if (e && e.cancelable) e.preventDefault(); // Prevent page wobble while swiping card
        const rot = Math.max(-18, Math.min(18, deltaX * 0.08));
        activeCard.style.transform = 'translate3d(' + deltaX.toFixed(1) + 'px, ' + (deltaY * 0.2).toFixed(1) + 'px, 30px) rotate(' + rot.toFixed(2) + 'deg)';
      }
    }

    function handleEnd() {
      if (!isInteracting) return;
      isInteracting = false;

      if (!activeCard) {
        resetAutoTimer();
        return;
      }

      const SWIPE_THRESHOLD = 36;

      if (isDragging && Math.abs(deltaX) > SWIPE_THRESHOLD) {
        hasSwiped = true;
        const swipingLeft = deltaX < 0;
        const targetX = swipingLeft ? -window.innerWidth * 0.85 : window.innerWidth * 0.85;
        const targetRot = swipingLeft ? -18 : 18;

        // Tinder fly-off animation
        activeCard.style.transition = 'transform 200ms cubic-bezier(0.2, 0.8, 0.25, 1), opacity 200ms ease';
        activeCard.style.transform = 'translate3d(' + targetX.toFixed(0) + 'px, ' + (deltaY * 0.2 + 10).toFixed(0) + 'px, 30px) rotate(' + targetRot + 'deg)';
        activeCard.style.opacity = '0';

        const nextIndex = swipingLeft
          ? (currentMobileIndex + 1) % TOTAL_CARDS
          : (currentMobileIndex - 1 + TOTAL_CARDS) % TOTAL_CARDS;
        const direction = swipingLeft ? 'next' : 'prev';

        const cardToReset = activeCard;
        setTimeout(() => {
          if (cardToReset) {
            cardToReset.style.transition = '';
            cardToReset.style.transform = '';
            cardToReset.style.opacity = '';
          }
          updateStackPositions(nextIndex, false, direction);
          activeCard = null;
          isDragging = false;
          resetAutoTimer();
        }, 190);
      } else {
        // Incomplete swipe or stationary hold release — snap smoothly back to deck
        hasSwiped = false;
        activeCard.style.transition = 'transform 240ms cubic-bezier(0.18, 0.89, 0.32, 1.25)';
        activeCard.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';

        const cardToReset = activeCard;
        setTimeout(() => {
          if (cardToReset) {
            cardToReset.style.transition = '';
            cardToReset.style.transform = '';
          }
          activeCard = null;
          isDragging = false;
          resetAutoTimer();
        }, 240);
      }
    }

    // Touch Event Listeners (Mobile devices)
    stackDeck.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 1) {
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (isInteracting && e.touches && e.touches.length === 1) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY, e);
      }
    }, { passive: false });

    window.addEventListener('touchend', () => {
      handleEnd();
    }, { passive: true });

    window.addEventListener('touchcancel', () => {
      handleEnd();
    }, { passive: true });

    // Mouse Event Listeners (Desktop responsive mode & dev testing)
    stackDeck.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        handleStart(e.clientX, e.clientY);
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (isInteracting) {
        handleMove(e.clientX, e.clientY, e);
      }
    });

    window.addEventListener('mouseup', () => {
      if (isInteracting) {
        handleEnd();
      }
    });

    // Handle tapping/clicking cards to open that page
    stackDeck.addEventListener('click', (e) => {
      if (hasSwiped) {
        e.preventDefault();
        e.stopPropagation();
        setTimeout(() => { hasSwiped = false; }, 80);
      } else {
        const link = e.target.closest('a') || (getFrontCard() && getFrontCard().querySelector('a'));
        if (link && link.href) {
          window.location.href = link.href;
        }
      }
    }, true);

    // Initial state: Start at first card (SEO)
    updateStackPositions(0, false);
    startAutoTimer();
  }
});
