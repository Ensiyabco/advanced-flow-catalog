'use strict';
(() => {
  const fileInput = document.getElementById('catalog');
  const status = document.getElementById('catalog-status');
  const reply = document.getElementById('reply');
  const matches = document.getElementById('matches');
  const prepare = document.getElementById('prepare');
  let catalog = null, revision = 0;
  fileInput.addEventListener('change', async () => {
    const current = ++revision;
    catalog = null; prepare.disabled = true; matches.replaceChildren(); reply.textContent = 'أرفق الكتالوج ثم ابحث عن صنف.';
    const file = fileInput.files[0];
    if (!file) {status.textContent = 'لم تُرفق نسخة بعد.'; return;}
    if (file.size > 10 * 1024 * 1024) {status.textContent = 'الملف يتجاوز 10 ميجابايت.'; return;}
    try {
      const data = JSON.parse(await file.text());
      if (current !== revision) return;
      const products = Array.isArray(data) ? data : data?.products;
      const categories = Array.isArray(data) ? [] : data?.categories ?? [];
      if (!Array.isArray(products) || !Array.isArray(categories)) throw new Error('format');
      catalog = {products, categories}; prepare.disabled = false;
      status.textContent = `تم تحميل نسخة تضم ${products.length} صنفًا. تاريخ تحديث المخزون غير متحقق.`;
    } catch {
      if (current === revision) status.textContent = 'تعذر قراءة الملف. أرفق JSON صالحًا يحتوي على مصفوفة products.';
    }
  });
  document.getElementById('lookup').addEventListener('submit', event => {
    event.preventDefault(); if (!catalog) return;
    const result = window.Alosh.draftProductReply({...catalog, query: document.getElementById('query').value});
    reply.textContent = result.text; matches.replaceChildren();
    for (const product of result.matches) {
      const item = document.createElement('li'); item.textContent = product.name; matches.appendChild(item);
    }
  });
})();
