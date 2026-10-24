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
