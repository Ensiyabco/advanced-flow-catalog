(() => {
  'use strict';
  function showOptions(data) {
    document.getElementById('product-share-options')?.close();
    const dialog = document.createElement('dialog');
    dialog.id = 'product-share-options';
    dialog.className = 'product-share-options';
    dialog.setAttribute('aria-labelledby', 'product-share-heading');
    const heading = document.createElement('h2');
    heading.id = 'product-share-heading';
    heading.textContent = 'مشاركة المنتج';
    const name = document.createElement('p');
    name.textContent = data.title;
    dialog.append(heading, name);
    const message = data.text + '\n' + data.url;
    const options = [
      ['واتساب', 'https://wa.me/?text=' + encodeURIComponent(message)],
      ['تليجرام', 'https://t.me/share/url?url=' + encodeURIComponent(data.url) + '&text=' + encodeURIComponent(data.text)],
      ['البريد الإلكتروني', 'mailto:?subject=' + encodeURIComponent(data.title) + '&body=' + encodeURIComponent(message)]
    ];
    for (const [label, href] of options) {
      const link = document.createElement('a');
      link.textContent = label;
      link.href = href;
      dialog.append(link);
    }
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'نسخ الرابط';
    copy.addEventListener('click', async () => {
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(data.url);
        copy.textContent = 'تم نسخ الرابط';
      } catch (_) { window.prompt('انسخ رابط المنتج:', data.url); }
    });
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'product-share-close';
    close.textContent = 'إغلاق';
    close.addEventListener('click', () => dialog.close());
    dialog.append(copy, close);
    dialog.addEventListener('close', () => dialog.remove(), {once:true});
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    document.body.append(dialog);
    dialog.showModal();
  }
  async function share(data) {
    // Only the updated native app advertises this marker and handles this URL.
    if (/EnsiyabcoApp\//.test(navigator.userAgent)) {
      const target = new URL('ensiyab-share://product');
      target.searchParams.set('title', data.title);
      target.searchParams.set('text', data.text);
      target.searchParams.set('url', data.url);
      location.href = target.href;
      return;
    }
    if (typeof navigator.share === 'function') {
      try { await navigator.share(data); return; }
      catch (error) { if (error.name === 'AbortError') return; }
    }
    // Unsupported browsers get choices; copying is an explicit user action.
    showOptions(data);
  }
  window.ENSIYAB_PRODUCT_SHARE = {share};
})();
