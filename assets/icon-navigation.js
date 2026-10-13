(() => {
  'use strict';
  function init() {
    const header = document.querySelector('header');
    if (!header) return;
    const page = location.pathname.split('/').pop() || 'index.html';
    const icons = {
      home: '<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8M16 5V3h3v4"/>',
      categories: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
      cart: '<path d="M4 7h16v14H4zM4 7l3-4h10l3 4M8 11a4 4 0 0 0 8 0"/>',
      search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
      install: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>'
    };
    const nav = document.createElement('nav');
    nav.className = 'ensiyab-icon-nav';
    nav.setAttribute('aria-label', 'التنقل الرئيسي');
    const items = [
      ['home', 'الرئيسية', 'index.html'],
      ['categories', 'الأقسام', 'index.html#catalog-categories'],
      ['cart', 'السلة', 'products.html?nav=cart'],
      ['search', 'بحث', 'products.html?nav=search'],
      ['install', 'تنزيل التطبيق', 'https://github.com/Ensiyabco/advanced-flow-catalog/releases/download/android-v1.0.1/app-debug.apk']
    ];
    items.forEach(([action, label, href]) => {
      const link = document.createElement('a');
      link.className = 'ensiyab-nav-item';
      link.href = href;
      link.dataset.action = action;
      if (action === 'home' && page === 'index.html') link.setAttribute('aria-current', 'page');
      link.innerHTML = '<span class="ensiyab-nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + icons[action] + '</svg>' +
        (action === 'cart' ? '<span class="ensiyab-nav-count cart-count-mirror" aria-hidden="true">0</span>' : '') + '</span><span>' + label + '</span>';
      link.addEventListener('click', event => {
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        if (perform(action)) {
          event.preventDefault();
          // Keep the category menu open: the page's outside-click handler
          // would otherwise close it again on this same navigation click.
          if (action === 'categories') event.stopPropagation();
        }
      });
      nav.appendChild(link);
    });
    header.insertAdjacentElement('afterend', nav);
    document.body.classList.add('ensiyab-has-icon-nav');
    // The Android WebView is already the installed catalog app.
    if (/\bwv\b|EnsiyabcoApp\//i.test(navigator.userAgent)) document.body.classList.add('ensiyab-native-app');
    const mobile = window.matchMedia('(max-width:820px)');
    const standalone = window.matchMedia('(display-mode:standalone)');
    const measure = () => document.documentElement.style.setProperty('--ensiyab-bottom-nav-height', nav.getBoundingClientRect().height + 'px');
    const updatePlacement = () => {
      document.body.classList.toggle('ensiyab-bottom-navigation', mobile.matches || (window.matchMedia('(pointer:coarse)').matches && window.screen.width <= 820) || standalone.matches || document.body.classList.contains('ensiyab-native-app'));
      measure();
    };
    mobile.addEventListener?.('change', updatePlacement);
    standalone.addEventListener?.('change', updatePlacement);
    window.addEventListener('resize', updatePlacement);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(measure).observe(nav);
    updatePlacement();
    window.addEventListener('pageshow', updatePlacement);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) updatePlacement(); });
    // A normal link remains usable when a device intercepts long-press gestures.
    const addAdminEntry = () => {
      const footer = document.querySelector('footer');
      if (!footer || footer.querySelector('.ensiyab-admin-entry')) return;
      const entry = document.createElement('a');
      entry.className = 'ensiyab-admin-entry';
      entry.href = 'products.html?nav=admin';
      entry.setAttribute('aria-label', 'المشرف');
      entry.innerHTML = '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/></svg><span>المشرف</span>';
      footer.append(entry);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addAdminEntry, {once:true});
    else addAdminEntry();
    const brand = header.querySelector('.logo-container, .site-brand-modern, .logo-area');
    if (brand) {
      let timer, origin, held = false;
      const cancel = () => { clearTimeout(timer); timer = null; };
      brand.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        cancel();
        brand.setPointerCapture?.(event.pointerId);
        origin = {x:event.clientX,y:event.clientY}; held = false;
        timer = setTimeout(() => {
          held = true;
          const target = new URL('products.html', location.href);
          target.searchParams.set('nav', 'admin');
          location.href = target.href;
        }, 1000);
      });
      brand.addEventListener('pointermove', event => {
        if (origin && Math.hypot(event.clientX-origin.x,event.clientY-origin.y)>12) cancel();
      });
      ['pointerup','pointercancel','pointerleave'].forEach(type => brand.addEventListener(type, cancel));
      brand.addEventListener('contextmenu', event => event.preventDefault());
      brand.addEventListener('click', event => { if (held) { event.preventDefault(); event.stopPropagation(); held=false; } }, true);
    }
    const cartLink = nav.querySelector('[data-action="cart"]');
    const badge = cartLink.querySelector('.ensiyab-nav-count');
    const existingBadge = document.getElementById('cart-count');
    function updateCount() {
      let count = existingBadge ? existingBadge.textContent : '0';
      if (!existingBadge) {
        try {
          const items = JSON.parse(localStorage.getItem('ansiyab_cart') || '[]');
          count = String(Array.isArray(items) ? items.reduce((sum, item) => sum + (Number(item.qty ?? item.quantity) || 0), 0) : 0);
        } catch (_) { count = '0'; }
      }
      badge.textContent = count;
      cartLink.setAttribute('aria-label', 'السلة، عدد الوحدات: ' + count);
    }
    updateCount();
    if (existingBadge) new MutationObserver(updateCount).observe(existingBadge, {childList:true, characterData:true, subtree:true});
    window.addEventListener('storage', updateCount);
    function perform(action) {
      if (action === 'cart' && typeof window.openCartModal === 'function') { window.openCartModal(); return true; }
      if (action === 'install' && typeof window.installEnsiyabcoApp === 'function') { window.installEnsiyabcoApp(); return true; }
      if (action === 'search') {
        const input = document.getElementById('catalog-search-input');
        if (input) { input.scrollIntoView({block:'center'}); input.focus({preventScroll:true}); return true; }
      }
      if (action === 'categories') {
        const grid = document.getElementById('home-categories-grid');
        if (grid) { (document.querySelector('.section-title-container') || grid).scrollIntoView({block:'start'}); return true; }

      }
      return false;
    }
    function performRequestedAction() {
      const requested = new URLSearchParams(location.search).get('nav');
      if (!['cart', 'search', 'admin'].includes(requested)) return;
      const url = new URL(location.href);
      url.searchParams.delete('nav');
      history.replaceState(null, '', url);
      if (requested === 'admin') {
        // Reuse the authenticated login flow. Never grant admin mode here.
        if (localStorage.getItem('isAdmin') !== 'true' && typeof window.toggleAdminMode === 'function') window.toggleAdminMode();
      } else perform(requested);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', performRequestedAction, {once:true});
    else performRequestedAction();
  }
  if (document.querySelector('header')) init();
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
