'use strict';
(() => {
  const fileInput = document.getElementById('catalog');
  const status = document.getElementById('catalog-status');
  const reply = document.getElementById('reply');
  const matches = document.getElementById('matches');
  const prepare = document.getElementById('prepare');
  const query = document.getElementById('query');
  const form = document.getElementById('lookup');
  const copy = document.getElementById('copy-reply');
  const copyStatus = document.getElementById('copy-status');
  let catalog = null, revision = 0, draft = '', draftRevision = 0;
  function clearDraft(message) {
    draftRevision++; draft = ''; copy.disabled = true;
    copyStatus.textContent = ''; matches.replaceChildren(); reply.textContent = message;
  }
  query.addEventListener('input', () => clearDraft('تغيّر البحث. اضغط «تجهيز اقتراح» لتحديث الرد.'));
  fileInput.addEventListener('change', async () => {
    const current = ++revision;
    catalog = null; prepare.disabled = true; clearDraft('أرفق الكتالوج ثم ابحث عن صنف.');
    const file = fileInput.files[0];
    if (!file) {status.textContent = 'لم تُرفق نسخة بعد.'; return;}
    if (file.size > 10 * 1024 * 1024) {status.textContent = 'الملف يتجاوز 10 ميجابايت.'; return;}
    status.textContent = 'جارٍ قراءة الكتالوج…';
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
  form.addEventListener('submit', event => {
    event.preventDefault(); if (!catalog) return;
    const result = window.Alosh.draftProductReply({...catalog, query: query.value});
    clearDraft(result.text);
    if (result.status === 'matched' || result.status === 'not_found') {
      draft = result.text; copy.disabled = false;
    }
    if (result.status === 'clarify') for (const product of result.matches) {
      const item = document.createElement('li');
      const choose = document.createElement('button'); choose.type = 'button';
      choose.textContent = 'اختيار: ' + product.name;
      choose.addEventListener('click', () => {query.value = product.name; form.requestSubmit(); query.focus();});
      item.appendChild(choose); matches.appendChild(item);
    }
  });
  copy.addEventListener('click', async () => {
    if (!draft || copy.disabled) return;
    const current = draftRevision, text = draft;
    try {
      await navigator.clipboard.writeText(text);
      if (current === draftRevision) copyStatus.textContent = 'تم نسخ الاقتراح. راجعه قبل استخدامه.';
    } catch {
      if (current === draftRevision) copyStatus.textContent = 'لم يسمح المتصفح بالنسخ. يمكنك تحديد نص الاقتراح ونسخه يدويًا.';
    }
  });
})();
