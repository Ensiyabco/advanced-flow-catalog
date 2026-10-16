(() => {
  'use strict';
  function init() {
    const storageKey = 'ensiyab_order_guide_v1';
    const help = document.createElement('dialog');
    help.className = 'order-help';
    help.setAttribute('aria-labelledby', 'order-help-title');
    help.setAttribute('aria-describedby', 'order-help-intro');
    help.innerHTML = `<h2 id="order-help-title">أهلًا بك في الأنسياب المتقدم</h2>
      <p id="order-help-intro">جهّز قائمة طلبك في ثلاث خطوات بسيطة.</p>
      <ol>
        <li><div><strong>اختر المنتجات</strong><span>تصفح الأقسام أو ابحث عن الصنف الذي تحتاجه.</span></div></li>
        <li><div><strong>حدد الكمية والوحدة</strong><span>اختر الحبة أو الكرتون حسب خيارات الصنف، ثم أضفه إلى قائمة الطلب.</span></div></li>
        <li><div><strong>راجع القائمة وأرسلها</strong><span>افتح السلة، راجع الأصناف والكميات، ثم اختر إرسال للواتساب.</span></div></li>
      </ol>
      <p class="order-help-note">الأسعار والتوفر وتأكيد الطلب النهائي عند التواصل. إضافة المنتج للسلة لا تعني حجز المخزون.</p>
      <div class="order-help-actions"><button type="button" class="order-help-done">ابدأ التصفح</button><button type="button" class="order-help-skip">تخطي الشرح</button></div>`;
    document.body.append(help);
    const launch = document.createElement('button');
    launch.type = 'button';
    launch.className = 'order-help-launch';
    launch.textContent = 'كيف أطلب من الموقع؟';
    const search = document.querySelector('.catalog-search');
    (search || document.querySelector('header'))?.insertAdjacentElement('afterend', launch);
    launch.addEventListener('click', () => { if (!help.open) help.showModal(); });
    const finish = () => {
      try { localStorage.setItem(storageKey, 'seen'); } catch (_) { /* Browsing works without storage. */ }
      help.close();
      launch.focus({ preventScroll: true });
    };
    help.querySelectorAll('button').forEach(button => button.addEventListener('click', finish));
    help.addEventListener('cancel', event => { event.preventDefault(); finish(); });
    let seen = false, admin = false;
    try { seen = localStorage.getItem(storageKey) === 'seen'; admin = localStorage.getItem('isAdmin') === 'true'; } catch (_) {}
    if (!seen && !admin && !new URLSearchParams(location.search).has('nav')) help.showModal();

    // Add arrival motion only when a card enters view, including newly loaded cards.
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const cardHost = document.querySelector('#home-categories-grid, #products-grid-container');
    if (cardHost && !reducedMotion.matches && 'IntersectionObserver' in window) {
      const tracked = new WeakSet();
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (!reducedMotion.matches) entry.target.classList.add('storefront-arrive');
        observer.unobserve(entry.target);
      }), { threshold: .08 });
      const observeCards = () => cardHost.querySelectorAll('.main-cat-card,.product-card').forEach(card => {
        if (!tracked.has(card)) { tracked.add(card); observer.observe(card); }
      });
      new MutationObserver(observeCards).observe(cardHost, { childList: true });
      observeCards();
    }

    // Keep the existing cart data/rendering, and supply dialog keyboard behavior.
    const cart = document.getElementById('cart-modal');
    if (!cart) return;
    const panel = cart.firstElementChild;
    const title = panel.querySelector('h3');
    title.id = 'order-cart-title';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', title.id);
    panel.tabIndex = -1;
    let opened = false, opener = null;
    const inerted = [];
    function closeCart() {
      if (typeof window.closeCartModal === 'function') window.closeCartModal();
      else window.closeModal('cart-modal');
    }
    const sync = () => {
      const visible = getComputedStyle(cart).display !== 'none';
      if (visible === opened) return;
      opened = visible;
      if (visible) {
        opener = document.activeElement;
        [...document.body.children].forEach(element => {
          if (element !== cart && element instanceof HTMLElement && !element.inert && !['SCRIPT','STYLE','LINK'].includes(element.tagName)) {
            element.inert = true; inerted.push(element);
          }
        });
        panel.focus();
      } else {
        inerted.splice(0).forEach(element => { element.inert = false; });
        if (opener?.isConnected) opener.focus({ preventScroll: true });
      }
    };
    new MutationObserver(sync).observe(cart, { attributes: true, attributeFilter: ['style','class'] });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); closeCart(); return; }
      if (event.key !== 'Tab') return;
      const controls = [...panel.querySelectorAll('button,input,a[href],[tabindex="0"]')].filter(element => !element.disabled && element.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); panel.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel)) { event.preventDefault(); first.focus(); }
    });
    // Item removal re-renders controls: retain keyboard access after a focused control disappears.
    new MutationObserver(() => { if (opened && !panel.contains(document.activeElement)) panel.focus(); }).observe(panel, { childList: true, subtree: true });
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
