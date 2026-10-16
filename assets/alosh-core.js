/* Read-only draft engine. No model, network, storage or execution connector. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./numbers.js') : root.EnsiyabNumbers);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Alosh = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (numbers) {
  'use strict';
  function key(value) {
    return numbers.digits(value).normalize('NFKC').replace(/[\u064b-\u065f\u0670\u0640]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }
  function hidden(category) {
    return category?.adminOnly === true || /^للمشرف\s*[—–-]?\s*بانتظار التصنيف$/.test(String(category?.name ?? '').trim());
  }
  function searchCatalog(input = {}) {
    const {query, products, categories = []} = input ?? {};
    if (typeof query !== 'string' || !query.trim() || query.length > 200 || !Array.isArray(products) || !Array.isArray(categories)) {
      return {status: 'invalid_input', matches: [], hint: 'أدخل اسم الصنف فقط، حتى 200 حرف، وأرفق كتالوجًا صالحًا.'};
    }
    const excluded = new Set(categories.filter(hidden).flatMap(c => [String(c.id), String(c.name)]));
    const q = key(query), tokens = q.split(' ');
    const candidates = products.filter(p => p && typeof p.name === 'string' && p.id != null && !hidden(p) && !hidden({name:p.mainCat}) && !excluded.has(String(p.mainCat)))
      .filter(p => { const words = key(p.name).split(' '); return q && tokens.every(t => words.includes(t)); });
    const exact = candidates.filter(p => key(p.name) === q);
    const matches = (exact.length ? exact : candidates).slice(0, 10).map(p => ({id: p.id, name: p.name, orderEnabled: p.orderEnabled !== false}));
    return {status: exact.length === 1 ? 'matched' : candidates.length ? 'clarify' : 'not_found', matches};
  }
  function draftProductReply(input) {
    const result = searchCatalog(input);
    let text;
    if (result.status === 'matched') {
      const product = result.matches[0];
      text = product.orderEnabled
        ? `الصنف مسجل في المعرض: ${product.name}. التوفر والكمية والسعر تحتاج تحققًا قبل تأكيد الطلب.`
        : `الصنف مسجل في المعرض: ${product.name}، لكن الطلب عليه موقوف حاليًا.`;
    } else if (result.status === 'clarify') {
      text = 'حدد الصنف أو المقاس المقصود من النتائج المسجلة قبل تجهيز الرد.';
    } else if (result.status === 'not_found') {
      text = 'لا يظهر هذا الصنف بهذا الاسم أو المقاس ضمن الأصناف المسجلة في نسخة الكتالوج المرفقة.';
    } else text = result.hint;
    return {...result, text, mode: 'suggestion_only', requiresReview: true, actions: []};
  }
  return Object.freeze({searchCatalog, draftProductReply});
});
