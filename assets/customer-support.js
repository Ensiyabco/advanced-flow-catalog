(() => {
  'use strict';
  function init() {
    if (document.getElementById('ensiyab-support')) return;
    const widget = document.createElement('aside');
    widget.id = 'ensiyab-support';
    widget.dir = 'rtl';
    widget.setAttribute('aria-label', 'خدمة العملاء');
    // Same business number used by contact.html and catalog orders.
    const phone = '966506645562';
    const icon = '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3Zm0 23.6a10.5 10.5 0 0 1-5.4-1.5l-.5-.3-3.9 1 1-3.8-.3-.5A10.6 10.6 0 1 1 16 26.6Zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1a8.7 8.7 0 0 1-4.3-3.8c-.3-.5.3-.5.9-1.7.1-.2.1-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.3 0-.6.1-.9.4-.9 1-1.3 2.1-.6 3.8 1.2 3 3.6 5.3 6.6 6.5 2.4 1 3.3.8 4.2.3.6-.4 1-1.5 1-2 0-.2-.1-.3-.4-.5Z"/></svg>';
    widget.innerHTML = '<section id="ensiyab-support-panel" role="dialog" aria-modal="false" aria-labelledby="ensiyab-support-title" hidden>' +
      '<div class="support-heading"><img src="assets/images/logo.webp" width="56" height="56" alt="شعار مؤسسة الأنسياب المتقدم"><div><strong id="ensiyab-support-title">مؤسسة الأنسياب المتقدم</strong><span>خدمة العملاء</span></div><button type="button" class="support-close" aria-label="إغلاق نافذة خدمة العملاء">×</button></div>' +
      '<div class="support-body"><p class="support-welcome">أهلًا وسهلًا بك 👋</p><p>نسعد بخدمتك! للاستفسار عن المنتجات أو طلبات الجملة، تواصل معنا عبر واتساب.</p><a class="support-enquiry" target="_blank" rel="noopener noreferrer">' + icon + '<span>استفسار عبر واتساب</span></a><small>يفتح واتساب في نافذة جديدة</small></div></section>' +
      '<button type="button" class="support-launcher" aria-label="فتح نافذة خدمة العملاء عبر واتساب" aria-expanded="false" aria-controls="ensiyab-support-panel">' + icon + '</button>';
    const panel = widget.querySelector('section');
    const launcher = widget.querySelector('.support-launcher');
    const close = widget.querySelector('.support-close');
    widget.querySelector('a').href = 'https://wa.me/' + phone + '?text=' + encodeURIComponent('السلام عليكم، لدي استفسار عن منتجات مؤسسة الأنسياب المتقدم.');
    function setOpen(open, restoreFocus = true) {
      panel.hidden = !open;
      launcher.setAttribute('aria-expanded', String(open));
      if (open) close.focus();
      else if (restoreFocus) launcher.focus();
    }
    launcher.addEventListener('click', () => setOpen(panel.hidden));
    close.addEventListener('click', () => setOpen(false));
    widget.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !panel.hidden) {
        event.stopPropagation();
        setOpen(false);
      }
    });
    document.addEventListener('click', event => {
      if (!panel.hidden && !widget.contains(event.target)) setOpen(false, false);
    });
    // Do not cover an existing cart, login or product modal.
    const syncModal = () => {
      const blocked = [...document.querySelectorAll('.modal, .modal-overlay, .lightbox-modal, dialog[open], [aria-modal="true"]')].some(el => getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && el.getBoundingClientRect().height > 0);
      widget.hidden = blocked;
      if (blocked && !panel.hidden) setOpen(false, false);
    };
    document.body.append(widget);
    new MutationObserver(syncModal).observe(document.body, {subtree:true, attributes:true, attributeFilter:['class','style','open','aria-modal']});
    syncModal();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
