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
      login: '<circle cx="12" cy="6" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>'
    };
    const nav = document.createElement('nav');
    nav.className = 'ensiyab-icon-nav';
    nav.setAttribute('aria-label', 'التنقل الرئيسي');
    const items = [
      ['home', 'الرئيسية', 'index.html'],
      ['categories', 'الأقسام', 'index.html#home-categories-grid'],
      ['cart', 'السلة', 'products.html?nav=cart'],
      ['search', 'بحث', 'products.html?nav=search'],
      ['login', 'دخول', 'products.html?nav=login']
    ];
    items.forEach(([action, label, href]) => {
      const link = document.createElement('a');
      link.className = 'ensiyab-nav-item';
      link.href = href;
      link.dataset.action = action;
      if (action === 'home' && page === 'index.html') link.setAttribute('aria-current', 'page');
      if (action === 'login') link.setAttribute('aria-label', 'دخول أو خروج المشرف');
      link.innerHTML = '<span class="ensiyab-nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + icons[action] + '</svg>' +
        (action === 'cart' ? '<span class="ensiyab-nav-count cart-count-mirror" aria-hidden="true">0</span>' : '') + '</span><span>' + label + '</span>';
      link.addEventListener('click', event => {
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        if (perform(action)) event.preventDefault();
      });
      nav.appendChild(link);
    });
    header.insertAdjacentElement('afterend', nav);
    document.body.classList.add('ensiyab-has-icon-nav');
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
      if (action === 'login') {
        const login = window.toggleAdminMode || window.triggerAdminLogin;
        if (typeof login === 'function') { login(); return true; }
      }
      if (action === 'search') {
        const input = document.getElementById('catalog-search-input');
        if (input) { input.scrollIntoView({block:'center'}); input.focus({preventScroll:true}); return true; }
      }
      if (action === 'categories') {
        const host = document.getElementById('catalog-top-nav');
        if (host) {
          host.classList.add('mobile-open');
          document.getElementById('catalog-menu-toggle')?.setAttribute('aria-expanded', 'true');
          host.scrollIntoView({block:'start'});
          document.getElementById('catalog-menu-toggle')?.focus({preventScroll:true});
          return true;
        }
      }
      return false;
    }
    const requested = new URLSearchParams(location.search).get('nav');
    if (['cart', 'search', 'login'].includes(requested)) {
      perform(requested);
      const url = new URL(location.href);
      url.searchParams.delete('nav');
      history.replaceState(null, '', url);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
