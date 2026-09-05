// Shared behavior for content pages (About, MBA Archive, SEO, Writings, etc.):
// the header stays transparent until .page-main is scrolled, then gets a soft band + blur.
document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.site-header');
  const scrollEl = document.querySelector('.page-main');
  if (!header) return;

  // The fixed sidebar sits right below the header — measure the header's real height
  // instead of guessing a fixed px offset, so it's always exactly aligned. A ResizeObserver
  // (not just a resize listener) catches every reason the header's size can change after
  // first paint too — e.g. a web font swapping in after DOMContentLoaded — so the sidebar
  // never ends up pinned to a stale, too-small offset.
  const setHeaderHeight = () => {
    document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
  };
  setHeaderHeight();
  if (window.ResizeObserver) {
    new ResizeObserver(setHeaderHeight).observe(header);
  } else {
    window.addEventListener('resize', setHeaderHeight);
  }

  if (!scrollEl) return;
  const onScroll = () => {
    header.classList.toggle('is-scrolled', scrollEl.scrollTop > 4);
  };
  scrollEl.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
});

// Vibe Coding page: each card's description clamps to 3 lines; a "Show more"/"Show less"
// toggle only appears on cards where the text actually overflows that clamp. The overflow
// check needs the stylesheet (and web fonts) fully applied first — DOMContentLoaded can fire
// before that, so wait for window 'load' (plus the fonts, if the browser supports the API).
window.addEventListener('load', () => {
  const measure = () => {
    document.querySelectorAll('.vibe-card').forEach((card) => {
      const desc = card.querySelector('.vibe-card-desc');
      const btn = card.querySelector('.vibe-card-toggle');
      if (!desc || !btn) return;
      btn.hidden = desc.scrollHeight <= desc.clientHeight + 1;
    });
  };
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measure);
  } else {
    measure();
  }

  document.querySelectorAll('.vibe-card-toggle').forEach((btn) => {
    const desc = btn.closest('.vibe-card').querySelector('.vibe-card-desc');
    const label = btn.querySelector('.vibe-card-toggle-label');
    if (!desc || !label) return;
    btn.addEventListener('click', () => {
      const expanded = desc.classList.toggle('is-expanded');
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      label.textContent = expanded ? 'Show less' : 'Show more';
    });
  });
});
