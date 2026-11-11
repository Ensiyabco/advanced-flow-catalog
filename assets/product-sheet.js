/* بطاقة المنتج الكبيرة: تفتح عند الضغط على صورة المنتج، وتسحب يمين/يسار للمنتج التالي */
(function () {
  let overlay, track, list = [];

  function esc(v) { return typeof escapeHtml === 'function' ? escapeHtml(v) : String(v ?? ''); }
  function imgs(p) { const s = typeof productDisplayImages === 'function' ? productDisplayImages(p) : (p.images || []); return s.length ? s : [placeholderImg]; }
  function cartTotal() { return (cart || []).reduce((s, i) => s + (i.qty || 0), 0); }

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'ps-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'تفاصيل المنتج');
    track = document.createElement('div');
    track.className = 'ps-track';
    overlay.appendChild(track);
    overlay.addEventListener('click', e => { if (e.target === overlay || e.target === track) close(); });
    document.addEventListener('keydown', e => {
      if (!overlay.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(1);
      if (e.key === 'ArrowRight') step(-1);
    });
    document.body.appendChild(overlay);
  }

  function slideHtml(p) {
    const s = imgs(p);
    const hasStock = p.stockQty !== undefined && p.stockQty !== null && p.stockQty !== '';
    const stock = hasStock ? Number(p.stockQty) : null;
    const unit = p.unit || 'حبة';
    const off = p.orderEnabled === false;
    const same = list.filter(x => x.mainCat && x.mainCat === p.mainCat).length;
    return `
      <div class="ps-media">
        <div class="ps-btns">
          <div><button class="ps-round" data-act="close" aria-label="إغلاق">✕</button></div>
          <div>
            <button class="ps-round" data-act="cart" aria-label="قائمة الطلب">🛍<b class="cart-count-mirror">${cartTotal()}</b></button>
            <button class="ps-round" data-act="share" aria-label="مشاركة المنتج">↗</button>
          </div>
        </div>
        <img class="ps-main" loading="lazy" decoding="async" src="${s[0]}" alt="${esc(p.name)}" onerror="this.onerror=null;this.src=placeholderImg;">
        ${s.length > 1 ? `<div class="ps-thumbs">${s.map((u, i) => `<img loading="lazy" src="${u}" alt="صورة ${i + 1}" class="${i ? '' : 'on'}" data-src="${u}">`).join('')}</div>` : ''}
      </div>
      <div class="ps-badge">⚡ توصيل داخل جدة</div>
      <div class="ps-box">
        <h3 class="ps-name">${esc(p.name)}</h3>
        <div class="ps-meta">
          <span>${esc(unit)}${p.boxQty ? ` · الكرتون ${esc(p.boxQty)}` : ''}</span>
          ${p.salesCode ? `<span>الكود: <bdi>${esc(p.salesCode)}</bdi></span>` : ''}
          ${hasStock ? `<span class="ps-stock ${stock > 0 ? '' : 'out'}">${stock > 0 ? '✔ متوفر' : 'نفد من المخزون'}</span>` : ''}
        </div>
        <div style="margin-top:8px;color:#173b63;font-weight:700">السعر عند الطلب</div>
      </div>
      ${p.description ? `<div class="ps-box"><h4>الوصف</h4><p class="ps-desc">${esc(p.description)}</p></div>` : ''}
      ${p.mainCat && same > 1 ? `<div class="ps-box ps-more"><span>${esc(p.mainCat)}</span><a data-act="more">اكتشف المزيد ‹</a></div>` : ''}
      <div style="height:16px"></div>
      <div class="ps-footer">
        <div class="ps-qty">
          <button data-act="inc" aria-label="زيادة">+</button>
          <input type="text" inputmode="numeric" value="1" aria-label="الكمية">
          <button data-act="dec" aria-label="إنقاص">−</button>
        </div>
        <select class="ps-unit" aria-label="الوحدة">
          <option value="حبة" ${unit === 'حبة' ? 'selected' : ''}>حبة</option>
          <option value="كرتون" ${unit === 'كرتون' ? 'selected' : ''}>كرتون</option>
        </select>
        <button class="ps-add" data-act="add" ${off ? 'disabled' : ''}>${off ? 'الطلب موقوف مؤقتًا' : 'أضف للطلب +'}</button>
      </div>`;
  }

  function toast(msg) {
    const t = document.createElement('div'); t.className = 'ps-toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 1800);
  }

  function addFromSlide(p, slide) {
    if (p.orderEnabled === false) return;
    const input = slide.querySelector('.ps-qty input');
    const qty = readOrderQuantity(input.value.trim());
    if (!Number.isInteger(qty) || qty < 1) { input.focus(); return toast('أدخل كمية صحيحة'); }
    const unitType = slide.querySelector('.ps-unit').value;
    const ex = cart.find(i => String(i.id) === String(p.id) && i.unitType === unitType);
    if (ex) { ex.qty += qty; ex.quantity = ex.qty; }
    else cart.push({ id: p.id, name: p.name, mainCat: p.mainCat, qty, unitType });
    saveCart(); updateCartBadge();
    try { trackCatalogEvent('add_to_cart', p, qty); } catch (e) {}
    toast(`✔ أُضيف ${qty} ${unitType} إلى الطلب`);
  }

  function wire(slide, p) {
    slide.addEventListener('click', e => {
      const el = e.target.closest('[data-act],[data-src],.ps-main');
      if (!el) return;
      if (el.dataset.src) {
        slide.querySelector('.ps-main').src = el.dataset.src;
        slide.querySelectorAll('.ps-thumbs img').forEach(i => i.classList.toggle('on', i === el));
        return;
      }
      if (el.classList.contains('ps-main')) {
        currentLightboxImages = imgs(p); currentLightboxIndex = Math.max(0, currentLightboxImages.indexOf(el.getAttribute('src')));
        document.getElementById('lightbox-img-src').src = currentLightboxImages[currentLightboxIndex];
        document.getElementById('lightbox-title').innerText = p.name;
        document.getElementById('image-lightbox').style.display = 'flex';
        return;
      }
      const input = slide.querySelector('.ps-qty input');
      const n = readOrderQuantity(input.value) || 0;
      switch (el.dataset.act) {
        case 'close': close(); break;
        case 'cart': close(); openCartModal(); break;
        case 'share': shareProduct(p.id, el); break;
        case 'inc': input.value = n + 1; break;
        case 'dec': input.value = Math.max(1, n - 1); break;
        case 'add': addFromSlide(p, slide); break;
        case 'more':
          close();
          renderProducts(products.filter(x => x.mainCat === p.mainCat), 'قسم: ' + p.mainCat);
          document.getElementById('products-grid-container')?.scrollIntoView({ behavior: 'smooth' });
          break;
      }
    });
  }

  let viewed = new Set();
  function onScroll() {
    const i = currentIndex();
    const p = list[i];
    if (p && !viewed.has(p.id)) { viewed.add(p.id); try { trackCatalogEvent('product_view', p); } catch (e) {} }
  }
  function currentIndex() {
    const w = track.firstElementChild ? track.firstElementChild.getBoundingClientRect().width + 12 : 1;
    return Math.round(Math.abs(track.scrollLeft) / w);
  }
  function step(d) { const s = track.children[currentIndex() + d]; s && s.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }

  function open(prodId) {
    if (!overlay) build();
    list = getCurrentVisibleProducts();
    let idx = list.findIndex(p => String(p.id) === String(prodId));
    if (idx < 0) { const p = products.find(x => String(x.id) === String(prodId)); if (!p) return; list = [p]; idx = 0; }
    track.innerHTML = '';
    viewed = new Set();
    list.forEach(p => {
      const s = document.createElement('article'); s.className = 'ps-slide'; s.innerHTML = slideHtml(p); wire(s, p); track.appendChild(s);
    });
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    track.children[idx].scrollIntoView({ inline: 'center', block: 'nearest' });
    track.onscroll = () => { clearTimeout(track._t); track._t = setTimeout(onScroll, 120); };
    onScroll();
    if (list.length > 1 && !sessionStorage.getItem('psHint')) {
      sessionStorage.setItem('psHint', '1');
      const h = document.createElement('div'); h.className = 'ps-hint'; h.textContent = '↔ اسحب للمنتج التالي';
      document.body.appendChild(h); setTimeout(() => { h.style.opacity = 0; setTimeout(() => h.remove(), 400); }, 2200);
    }
    history.pushState({ psOpen: 1 }, '');
  }

  function close() {
    if (!overlay || !overlay.classList.contains('open')) return;
    overlay.classList.remove('open');
    track.innerHTML = '';
    document.body.style.overflow = '';
    if (history.state && history.state.psOpen) history.back();
  }
  // زر الرجوع في الجوال يقفل البطاقة بدل ما يطلع من الصفحة
  window.addEventListener('popstate', () => {
    if (overlay && overlay.classList.contains('open')) { overlay.classList.remove('open'); track.innerHTML = ''; document.body.style.overflow = ''; }
  });

  window.openProductSheet = open;
  window.closeProductSheet = close;
})();
