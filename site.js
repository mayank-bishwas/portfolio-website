// Shared behavior for content pages (About, MBA Archive, SEO, Writings, etc.):
// the header stays transparent until .page-main is scrolled, then gets a soft band + blur.
document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.site-header');
  const scrollEl = document.querySelector('.page-main');
  if (!header) return;

  // Shared behavior for content pages (About, MBA Archive, SEO, Writings, etc.):
  // the header stays transparent until .page-main is scrolled, then gets a soft band + blur.
  const setHeaderHeight = () => {
    document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
  };
  setHeaderHeight();
  if (window.ResizeObserver) {
    new ResizeObserver(setHeaderHeight).observe(header);
  } else {
    window.addEventListener('resize', setHeaderHeight);
  }

  const updateHeaderScroll = () => {
    const isScrolled = (scrollEl && scrollEl.scrollTop > 4) || window.scrollY > 4;
    header.classList.toggle('is-scrolled', isScrolled);
  };
  if (scrollEl) {
    scrollEl.addEventListener('scroll', updateHeaderScroll, { passive: true });
  }
  window.addEventListener('scroll', updateHeaderScroll, { passive: true });
  updateHeaderScroll();

  // Format center Latest Work link to match homepage exactly
  const latestWorkLink = header.querySelector('.latest-work a');
  if (latestWorkLink && !latestWorkLink.querySelector('.mobile-latest-name')) {
    latestWorkLink.className = 'mobile-latest-work';
    latestWorkLink.innerHTML = `
      <span class="mobile-latest-prefix">Latest Work (Aug &lsquo;26):</span>
      <span class="mobile-latest-name">Survey8b(.)com</span>
      <svg class="mobile-external-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 17L17 7M17 7H7M17 7V17"/></svg>
    `;
  }

  // Mobile Explorer Navigation Drawer
  const sidebar = document.querySelector('.page-sidebar');
  if (sidebar) {
    const headerCanvas = header.querySelector('.chrome-canvas--header') || header;

    // 1. Create hamburger button in internal page header if not present
    let toggleBtn = header.querySelector('.mobile-drawer-toggle');
    if (!toggleBtn) {
      toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'mobile-drawer-toggle';
      toggleBtn.setAttribute('aria-label', 'Open navigation menu');
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.setAttribute('aria-controls', 'explorer-drawer');
      toggleBtn.innerHTML = `
        <span class="hamburger-bar"></span>
        <span class="hamburger-bar"></span>
        <span class="hamburger-bar"></span>
      `;
      headerCanvas.appendChild(toggleBtn);
    }

    // Assign accessibility ID & role
    sidebar.id = 'explorer-drawer';
    sidebar.setAttribute('aria-label', 'Explorer Navigation');

    // 2. Create dimmed backdrop overlay if not present
    let backdrop = document.querySelector('.drawer-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'drawer-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.appendChild(backdrop);
    }

    // 3. Create drawer header (Home logo on left, Close button on right, no title)
    let drawerHeader = sidebar.querySelector('.drawer-header');
    if (!drawerHeader) {
      drawerHeader = document.createElement('div');
      drawerHeader.className = 'drawer-header';
      sidebar.insertBefore(drawerHeader, sidebar.firstChild);
    }
    drawerHeader.innerHTML = `
      <a href="/" class="drawer-home-logo" aria-label="Home">
        <img src="/images/atom-glow.png" alt="Mayank Bishwas">
      </a>
      <button type="button" class="drawer-close" aria-label="Close navigation menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;

    // Ensure category highlighting reflects current page
    const currentPath = window.location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/$/, '') || '/';
    sidebar.querySelectorAll('.page-card').forEach((card) => {
      const href = card.getAttribute('href');
      if (href) {
        const linkPath = href.replace(/\.html$/, '').replace(/\/$/, '') || '/';
        const isCurrent = (linkPath !== '' && linkPath !== '/' && currentPath === linkPath);
        if (isCurrent) {
          card.classList.add('is-current');
          card.setAttribute('aria-current', 'page');
        } else if (currentPath === '/about' || currentPath === '/' || !isCurrent) {
          // If on about or homepage or another category, make sure this card isn't marked current
          if (!card.matches('div[aria-current="page"]')) {
            card.classList.remove('is-current');
            card.removeAttribute('aria-current');
          }
        }
      }
    });

    // 4. Create drawer footer (Blinking red-dot Open for Work + vertically stacked About / LinkedIn / Email)
    let drawerFooter = sidebar.querySelector('.drawer-footer');
    if (!drawerFooter) {
      drawerFooter = document.createElement('div');
      drawerFooter.className = 'drawer-footer';
      sidebar.appendChild(drawerFooter);
    }
    drawerFooter.innerHTML = `
      <div class="drawer-status">
        <span class="open-for-work-dot" aria-hidden="true"></span>
        <span class="open-for-work-label">Open for work</span>
      </div>
      <nav class="drawer-links" aria-label="Quick links">
        <a href="/about" class="drawer-nav-item">About</a>
        <a href="https://www.linkedin.com/in/mayankbishwas/" target="_blank" rel="noopener" class="drawer-nav-item">LinkedIn</a>
        <a href="mailto:mayankbishwas@gmail.com" class="drawer-nav-item">Email</a>
      </nav>
    `;

    // Drawer state controls
    const openDrawer = () => {
      sidebar.classList.add('is-open');
      backdrop.classList.add('is-active');
      document.body.classList.add('drawer-open');
      document.documentElement.classList.add('drawer-open');
      toggleBtn.setAttribute('aria-expanded', 'true');
    };

    const closeDrawer = () => {
      sidebar.classList.remove('is-open');
      backdrop.classList.remove('is-active');
      document.body.classList.remove('drawer-open');
      document.documentElement.classList.remove('drawer-open');
      toggleBtn.setAttribute('aria-expanded', 'false');
    };

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = sidebar.classList.contains('is-open');
      if (isOpen) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    const closeBtn = drawerHeader.querySelector('.drawer-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeDrawer();
      });
    }

    backdrop.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('is-open')) {
        closeDrawer();
      }
    });

    // Close upon clicking internal links inside the drawer
    sidebar.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        closeDrawer();
      });
    });
  }

  // Initialize universal deep-link system across all content sections
  initUniversalDeepLinks();
});

// ==========================================================================
// Universal Deep Links Engine
// ==========================================================================
const LINK_ICON_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';
const CHECK_ICON_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';

function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&amp;|&/g, 'and')
    .replace(/['’‘"`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function getDeepLinkToast() {
  let toast = document.getElementById('deep-link-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'deep-link-toast';
    toast.className = 'deep-link-toast';
    toast.setAttribute('aria-hidden', 'true');
    toast.setAttribute('role', 'status');
    toast.textContent = 'Link copied to clipboard';
    document.body.appendChild(toast);
  }
  return toast;
}

function getDeepLinkAnnouncer() {
  let announcer = document.getElementById('deep-link-announcer');
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.id = 'deep-link-announcer';
    announcer.className = 'sr-only';
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    document.body.appendChild(announcer);
  }
  return announcer;
}

let deepLinkToastTimer = null;
function copyDeepLink(targetId, title, btn) {
  const url = new URL(window.location.href);
  url.hash = targetId;
  const canonicalUrl = url.toString();

  const handleSuccess = () => {
    btn.classList.add('is-copied');
    btn.innerHTML = CHECK_ICON_SVG;
    btn.setAttribute('aria-label', `Link copied to clipboard for ${title}`);

    const toast = getDeepLinkToast();
    toast.textContent = 'Link copied to clipboard';
    toast.classList.add('is-visible');
    if (deepLinkToastTimer) clearTimeout(deepLinkToastTimer);
    deepLinkToastTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 2000);

    const announcer = getDeepLinkAnnouncer();
    announcer.textContent = `Direct link for ${title} copied to clipboard`;

    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#' + targetId);
    } else {
      window.location.hash = targetId;
    }

    const target = document.getElementById(targetId);
    if (target) {
      highlightTarget(target);
    }

    setTimeout(() => {
      btn.classList.remove('is-copied');
      btn.innerHTML = LINK_ICON_SVG;
      btn.setAttribute('aria-label', `Copy direct link to ${title}`);
    }, 1800);
  };

  const handleFailure = () => {
    window.prompt('Copy direct link to clipboard:', canonicalUrl);
  };

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(canonicalUrl)
      .then(handleSuccess)
      .catch(() => {
        fallbackCopy(canonicalUrl) ? handleSuccess() : handleFailure();
      });
  } else {
    fallbackCopy(canonicalUrl) ? handleSuccess() : handleFailure();
  }
}

function fallbackCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (err) {
    return false;
  }
}

function highlightTarget(el) {
  if (!el) return;
  el.classList.remove('deep-link-highlight');
  void el.offsetWidth;
  el.classList.add('deep-link-highlight');
  setTimeout(() => {
    el.classList.remove('deep-link-highlight');
  }, 2200);
}

function scrollToDeepLink(target, options = { smooth: true }) {
  if (!target) return;

  // 1. Expand all parent collapsed accordions
  let parent = target.parentElement;
  let openedParent = false;
  while (parent && parent !== document.body) {
    if (parent.tagName === 'DETAILS' && !parent.open) {
      parent.open = true;
      openedParent = true;
    }
    parent = parent.parentElement;
  }

  // 2. Perform scroll accounting for sticky header
  const performScroll = () => {
    const header = document.querySelector('.site-header') || document.querySelector('.snc-header');
    const headerOffset = (header ? header.offsetHeight : 70) + 24;
    const scrollEl = document.querySelector('.page-main');

    const style = scrollEl ? window.getComputedStyle(scrollEl) : null;
    const isDesktopScroll = scrollEl && style && (style.overflowY === 'auto' || style.overflowY === 'scroll') && scrollEl.scrollHeight > scrollEl.clientHeight;

    if (isDesktopScroll) {
      const scrollElRect = scrollEl.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const currentScroll = scrollEl.scrollTop;
      const targetTop = (targetRect.top - scrollElRect.top) + currentScroll - headerOffset;
      scrollEl.scrollTo({
        top: Math.max(0, targetTop),
        behavior: options.smooth ? 'smooth' : 'auto'
      });
    } else {
      const targetRect = target.getBoundingClientRect();
      const targetTop = targetRect.top + window.scrollY - headerOffset;
      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: options.smooth ? 'smooth' : 'auto'
      });
    }

    highlightTarget(target);
  };

  if (openedParent) {
    requestAnimationFrame(() => {
      requestAnimationFrame(performScroll);
    });
  } else {
    performScroll();
  }
}

function initUniversalDeepLinks() {
  const usedIds = new Map();

  function registerId(preferredId) {
    let clean = slugify(preferredId) || 'entry';
    if (!usedIds.has(clean)) {
      usedIds.set(clean, 1);
      return clean;
    }
    let count = usedIds.get(clean) + 1;
    usedIds.set(clean, count);
    return `${clean}-${count}`;
  }

  // Pre-seed any IDs already explicitly written in HTML
  document.querySelectorAll('[id]').forEach((el) => {
    if (el.id && !el.id.startsWith('grain') && !el.id.startsWith('explorer') && !el.id.startsWith('deep-link')) {
      usedIds.set(el.id, 1);
    }
  });

  function createLinkButton(targetId, title) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'deep-link-btn';
    btn.setAttribute('aria-label', `Copy direct link to ${title}`);
    btn.setAttribute('title', `Copy direct link to ${title}`);
    btn.innerHTML = LINK_ICON_SVG;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      copyDeepLink(targetId, title, btn);
    });
    return btn;
  }

  // 1. Page Title (H1)
  const pageTitle = document.querySelector('h1.page-title, .snc-coming-soon h1');
  if (pageTitle && !pageTitle.querySelector('.deep-link-btn')) {
    const titleText = pageTitle.textContent.trim();
    const id = pageTitle.id || registerId(titleText);
    pageTitle.id = id;
    pageTitle.classList.add('deep-link-target');
    pageTitle.appendChild(createLinkButton(id, titleText));
  }

  // 2. Major Accordion Sections (<details class="page-section">)
  document.querySelectorAll('details.page-section').forEach((details) => {
    const summary = details.querySelector('summary');
    if (!summary) return;
    const summaryTitle = summary.textContent.trim();
    const id = details.id || registerId(summaryTitle);
    details.id = id;
    details.classList.add('deep-link-target');

    if (!summary.querySelector('.deep-link-btn')) {
      summary.appendChild(createLinkButton(id, summaryTitle));
    }
  });

  // 3. Entries (.page-item)
  document.querySelectorAll('.page-item').forEach((item) => {
    // Media pair grid with multiple individual figcaptions:
    const mediaItems = item.querySelectorAll('.page-item-media');
    if (item.classList.contains('page-item--media-pair') && mediaItems.length > 1) {
      mediaItems.forEach((media) => {
        const figcaption = media.querySelector('figcaption');
        const img = media.querySelector('img');
        const title = (figcaption ? figcaption.textContent.trim() : '') || (img ? img.alt : '') || 'Media item';
        const id = media.id || registerId(title);
        media.id = id;
        media.classList.add('deep-link-target');
        if (figcaption && !figcaption.querySelector('.deep-link-btn')) {
          figcaption.appendChild(createLinkButton(id, title));
        } else if (!media.querySelector('.deep-link-btn')) {
          media.appendChild(createLinkButton(id, title));
        }
      });
      return;
    }

    // Standard single page item:
    let title = '';
    const itemTitleEl = item.querySelector('.page-item-title');
    const strongEl = item.querySelector('.page-item-text strong, strong');
    const figcaptionEl = item.querySelector('figcaption');
    const imgEl = item.querySelector('img');
    const iframeEl = item.querySelector('iframe');

    if (itemTitleEl) {
      title = itemTitleEl.textContent.trim();
    } else if (strongEl && strongEl.textContent.trim().length > 1) {
      title = strongEl.textContent.trim().replace(/[:\u2014\u2013-]+$/, '').trim();
    } else if (figcaptionEl) {
      title = figcaptionEl.textContent.trim();
    } else if (imgEl && imgEl.alt && !imgEl.alt.includes('placeholder')) {
      title = imgEl.alt.trim();
    } else if (iframeEl && iframeEl.title) {
      title = iframeEl.title.trim();
    } else {
      title = item.textContent.trim().slice(0, 30);
    }

    const id = item.id || registerId(title);
    item.id = id;
    item.classList.add('deep-link-target');

    if (!item.querySelector('.deep-link-btn')) {
      const btn = createLinkButton(id, title);
      if (itemTitleEl) {
        itemTitleEl.appendChild(btn);
      } else if (strongEl && strongEl.parentElement) {
        strongEl.insertAdjacentElement('afterend', btn);
      } else if (figcaptionEl) {
        figcaptionEl.appendChild(btn);
      } else {
        item.appendChild(btn);
      }
    }
  });

  // 4. Vibe Coding Cards (.vibe-card)
  document.querySelectorAll('.vibe-card').forEach((card) => {
    const titleEl = card.querySelector('.vibe-card-title');
    if (!titleEl) return;
    const title = titleEl.textContent.trim();
    const id = card.id || registerId(title);
    card.id = id;
    card.classList.add('deep-link-target');

    if (!card.querySelector('.deep-link-btn')) {
      titleEl.insertAdjacentElement('afterend', createLinkButton(id, title));
    }
  });

  // 5. Tools Grid Images (.tools-grid img)
  document.querySelectorAll('.tools-grid img').forEach((img) => {
    const title = img.alt || 'Tool';
    const id = img.id || registerId(title);
    img.id = id;
    img.classList.add('deep-link-target');
  });

  // 6. Bio Grid Items (About Page)
  document.querySelectorAll('.bio-grid > img, .bio-grid > .bio-avatar').forEach((bioEl) => {
    const tooltip = bioEl.querySelector('.bio-tooltip');
    const title = (tooltip ? tooltip.textContent.trim() : '') || (bioEl.alt ? bioEl.alt.trim() : '') || 'Bio entry';
    const id = bioEl.id || registerId(title);
    bioEl.id = id;
    bioEl.classList.add('deep-link-target');
  });

  // 7. SNC Specific Rows
  const sncHero = document.querySelector('.snc-hero-row');
  if (sncHero) {
    const id = sncHero.id || registerId('My Life runs on Sticky Notes');
    sncHero.id = id;
    sncHero.classList.add('deep-link-target');
    const h2 = sncHero.querySelector('h2');
    if (h2 && !h2.querySelector('.deep-link-btn')) {
      h2.appendChild(createLinkButton(id, 'My Life runs on Sticky Notes'));
    }
  }

  const sncCta = document.querySelector('.snc-cta-row');
  if (sncCta) {
    const id = sncCta.id || registerId('Play Scavenger Hunt Game');
    sncCta.id = id;
    sncCta.classList.add('deep-link-target');
  }

  // 8. Navigation handler
  function handleHashNav(isInitial = false) {
    const hash = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : '';
    if (!hash) return;
    const target = document.getElementById(hash);
    if (target) {
      scrollToDeepLink(target, { smooth: !isInitial });
    }
  }

  // Execute initial navigation if hash is present
  if (window.location.hash) {
    setTimeout(() => handleHashNav(true), 60);
  }

  window.addEventListener('hashchange', () => handleHashNav(false));
  window.addEventListener('popstate', () => handleHashNav(false));

  window.addEventListener('load', () => {
    if (window.location.hash) {
      setTimeout(() => handleHashNav(true), 120);
    }
  });
}

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
