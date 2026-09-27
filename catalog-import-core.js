/* Catalog import: deterministic validation/planning. No network or storage writes. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CatalogImport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MAX_ROWS = 5000;
  const fields = ['name', 'itemNumber', 'salesCode', 'unit', 'boxQty', 'stockQty'];
  const aliases = {
    name: ['اسم الصنف', 'اسم المنتج', 'الصنف', 'المنتج', 'name', 'product name', 'item name', 'description', 'وصف الصنف'],
    itemNumber: ['رقم الصنف', 'item number', 'itemnumber'],
    salesCode: ['الكود', 'كود الصنف', 'رقم التصنيع', 'كود المبيعات', 'كود', 'code', 'sku', 'sales code', 'barcode', 'باركود'],
    unit: ['الوحدة', 'وحده', 'unit'], boxQty: ['شد الطرد', 'شد الكرتون', 'التعبئة', 'pack', 'boxqty', 'pack quantity'],
    stockQty: ['المخزون', 'الكمية', 'كمية المخزن', 'stock', 'stockqty', 'quantity']
  };
  const text = value => String(value ?? '').trim();
  function nameKey(value) {
    return text(value).normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640\u200E\u200F\u061C]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي')
      .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x660)).replace(/\s+/g, ' ').toLowerCase();
  }
  // Codes are identifiers: retain case, zeroes and all letters. Never coerce to Number.
  const codeKey = value => text(value);
  function fullName(row) {
    const name = text(row.name), number = text(row.itemNumber);
    return number && !name.endsWith(' — ' + number) ? name + ' — ' + number : name;
  }
  const compactName = value => nameKey(value).replace(/[^\p{L}\p{N}]/gu, '');
  const gramCache = new Map();
  function grams(value) {
    const raw=text(value);
    if(gramCache.has(raw))return gramCache.get(raw);
    const key=compactName(value);
    const counts=new Map();for(let i=0;i<key.length-1;i++){const gram=key.slice(i,i+2);counts.set(gram,(counts.get(gram)||0)+1);}
    const result={key,counts,size:Math.max(0,key.length-1)};
    if(gramCache.size>20000)gramCache.clear();gramCache.set(raw,result);return result;
  }
  function similarity(a, b) {
    a=grams(a);b=grams(b);if(a.key===b.key)return 1;if(!a.size||!b.size)return 0;
    let shared=0;for(const [g,n] of a.counts)shared+=Math.min(n,b.counts.get(g)||0);
    return 2*shared/(a.size+b.size);
  }
  function integer(value, minimum, fallback) {
    const raw = text(value).replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x660))
      .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x6f0));
    if (!raw) return fallback;
    const result = /^\d+$/.test(raw) ? Number(raw) : NaN;
    return Number.isSafeInteger(result) && result >= minimum ? result : NaN;
  }
  function guessColumns(header) {
    return Object.fromEntries(fields.map(field => [field,
      header.findIndex(cell => aliases[field].some(alias => nameKey(alias) === nameKey(cell)))]));
  }
  function rowsFromMatrix(matrix, mapping, start = 1) {
    if (!Number.isInteger(mapping.name) || mapping.name < 0) throw new Error('حدد عمود اسم الصنف.');
    const used = fields.map(f => mapping[f]).filter(v => Number.isInteger(v) && v >= 0);
    if (new Set(used).size !== used.length) throw new Error('لا يمكن استخدام العمود نفسه لأكثر من حقل.');
    const rows = [];
    for (let i = start; i < matrix.length; i++) {
      if (!matrix[i].some(cell => text(cell))) continue;
      const row = {sourceRow: i + 1, selected: true};
      for (const field of fields) row[field] = mapping[field] >= 0 ? text(matrix[i][mapping[field]]) : '';
      rows.push(row);
      if (rows.length > MAX_ROWS) throw new Error('الحد الأقصى للدفعة 5000 صنف. قسّم الملف إلى دفعات.');
    }
    return rows;
  }
  function indexBy(items, key) {
    const map = new Map();
    items.forEach((item, index) => {
      const value = key(item);
      if (value) map.set(value, [...(map.get(value) || []), index]);
    });
    return map;
  }
  function plan(rows, products, allowReplace = false) {
    const names = indexBy(products, p => nameKey(p.name));
    const compact = indexBy(products, p => compactName(p.sourceName || p.name));
    const numbers = indexBy(products, p => codeKey(p.itemNumber));
    const codes = indexBy(products, p => codeKey(p.salesCode));
    const active = rows.filter(r => r.selected !== false);
    const fileNames = indexBy(active, r => nameKey(fullName(r)));
    const fileCodes = indexBy(active, r => codeKey(r.salesCode));
    const fileNumbers = indexBy(active, r => codeKey(r.itemNumber));
    const result = rows.map((row, index) => {
      const item = {index, row, status: 'invalid', message: '', target: null};
      const reject = message => Object.assign(item, {message});
      if (row.selected === false) return Object.assign(item, {status: 'excluded', message: 'مستبعد'});
      const name = fullName(row), code = text(row.salesCode), number = text(row.itemNumber);
      if (!text(row.name) || name.length > 300) return reject('اسم الصنف مطلوب، وبحد أقصى 300 حرف.');
      if (code.length > 100) return reject('الكود أطول من 100 حرف.');
      if (/^[=+@]/.test(code)) return reject('أدخل كودًا نصيًا، وليس صيغة حسابية.');
      if ((fileNames.get(nameKey(name)) || []).length > 1) return reject('اسم مكرر في الملف؛ استبعد النسخة الزائدة.');
      if (code && (fileCodes.get(code) || []).length > 1) return reject('كود مكرر في الملف؛ راجع الأصناف أو استبعد التكرار.');
      if (number && (fileNumbers.get(number) || []).length > 1) return reject('رقم صنف مكرر في الملف.');
      const boxQty = integer(row.boxQty, 0, 1), stockQty = integer(row.stockQty, 0, null);
      if (Number.isNaN(boxQty)) return reject('شد الكرتون يجب أن يكون عددًا صحيحًا غير سالب.');
      if (Number.isNaN(stockQty)) return reject('المخزون يجب أن يكون عددًا صحيحًا غير سالب، أو فارغًا.');
      if (text(row.unit).length > 40) return reject('الوحدة أطول من 40 حرفًا.');
      let matches = codes.get(code) || numbers.get(number) || names.get(nameKey(name)) || names.get(nameKey(row.name)) || compact.get(compactName(row.name)) || [];
      if (row.targetId && row.targetId !== 'new') matches = products.map((p,i)=>String(p.id)===String(row.targetId)?i:-1).filter(i=>i>=0);
      if (row.targetId && row.targetId !== 'new' && !matches.length) return reject('المنتج الذي اخترته لم يعد موجودًا. أعد المطابقة.');
      if (row.targetId === 'new') matches = [];
      if (matches.length > 1) return reject('أكثر من منتج في الموقع بهذا الاسم؛ يلزم تصحيح الأسماء أولًا.');
      const owners = codes.get(code) || [];
      if (code && owners.some(owner => !matches.includes(owner))) return reject('هذا الكود مرتبط بمنتج آخر في الموقع.');
      const numberOwners = numbers.get(number) || [];
      if (number && numberOwners.some(owner => !matches.includes(owner))) return reject('رقم الصنف مرتبط بمنتج آخر.');
      if (matches.length === 1) {
        item.target = matches[0];
        const existing = products[item.target], previous = text(existing.salesCode);
        if (number && text(existing.itemNumber) && text(existing.itemNumber)!==number) return reject('المنتج مرتبط برقم صنف مختلف؛ راجع الربط.');
        if (code && previous && previous !== code && !allowReplace) return reject('الكود الموجود: ' + previous + '؛ فعّل استبدال الأكواد فقط إن كان التغيير مقصودًا.');
        const changes = {};
        if (number) { changes.name = fullName({name: existing.sourceName || existing.name, itemNumber: number}); changes.sourceName = existing.sourceName || existing.name; changes.itemNumber = number; }
        if (code) changes.salesCode = code;
        if (text(row.boxQty)) changes.boxQty = boxQty;
        item.changes = changes;
        if (Object.entries(changes).every(([k,v])=>existing[k]===v)) return Object.assign(item, {status:'unchanged',message:'موجود — لا تغيير'});
        return Object.assign(item, {status: 'update', message: 'تحديث الاسم والكود والشد: ' + existing.name});
      }
      if (row.targetId !== 'new') {
        const suggestions = products.map((p,i)=>({index:i,score:similarity(row.name,p.sourceName||p.name)}))
          .filter(s=>s.score>=.82).sort((a,b)=>b.score-a.score).slice(0,3);
        if (suggestions.length) { item.suggestions=suggestions.map(s=>products[s.index]); return reject('اسم قريب من منتج موجود؛ اختر الربط أو «صنف جديد» بعد المراجعة.'); }
      }
      return Object.assign(item, {status: 'new', message: 'بطاقة جديدة — بدون قسم', values: {
        name, sourceName:text(row.name), itemNumber:number, salesCode: code, unit: text(row.unit) || 'حبة', boxQty, stockQty,
        mainCat: '', subCat: '', images: [], orderEnabled: true
      }});
    });
    const targets=indexBy(result.filter(e=>e.status==='update'),e=>String(e.target));
    for (const item of result) if(item.status==='update' && targets.get(String(item.target)).length>1) {item.status='invalid';item.message='أكثر من صف سيعدّل المنتج نفسه؛ اختر الصف الصحيح.';}
    return result;
  }
  function applyPlan(products, entries) {
    if (entries.some(e => e.status === 'invalid')) throw new Error('صحح الصفوف التي تحتاج مراجعة أو استبعدها قبل الحفظ.');
    const next = products.map(p => ({...p}));
    let maxId = products.reduce((max, p) => Number.isSafeInteger(Number(p.id)) ? Math.max(max, Number(p.id)) : max, 0);
    for (const entry of entries) {
      if (entry.status === 'update') next[entry.target] = {...next[entry.target], ...entry.changes};
      if (entry.status === 'new') {
        if (!Number.isSafeInteger(++maxId)) throw new Error('تعذر إنشاء معرّف آمن للمنتج.');
        next.push({id: maxId, ...entry.values});
      }
    }
    return next;
  }
  // Group PDF text fragments by baseline, then by visible gaps between cells.
  // Bidi text inside an item is already logical text; never reverse characters.
  function pdfRows(items) {
    const lines = [];
    for (const item of items.filter(i => text(i.str) && i.transform)) {
      const y = item.transform[5], height = Math.abs(item.height || item.transform[3]) || 10;
      let line = lines.find(l => Math.abs(l.y - y) <= Math.max(2, Math.min(l.height, height) * .3));
      if (!line) { line = {y, height, items: []}; lines.push(line); }
      line.items.push(item);
    }
    return lines.sort((a, b) => b.y - a.y).map(line => {
      const ordered = line.items.sort((a, b) => a.transform[4] - b.transform[4]);
      const cells = [];
      for (const item of ordered) {
        const last = cells[cells.length - 1], left = item.transform[4], right = left + Math.abs(item.width || 0);
        if (!last || left - last.right > line.height * 1.5) cells.push({right, items: [item]});
        else { last.items.push(item); last.right = Math.max(last.right, right); }
      }
      const rtl = line.items.some(i => i.dir === 'rtl');
      if (rtl) cells.reverse();
      return cells.map(cell => {
        if (cell.items.some(i => i.dir === 'rtl')) cell.items.reverse();
        return cell.items.map(i => text(i.str)).join(' ');
      });
    });
  }
  async function commit(client, snapshot, nextProducts, now = new Date().toISOString()) {
    let query = client.from('catalog_state').update({products: nextProducts, updated_at: now}).eq('id', 'main');
    query = snapshot.updated_at == null ? query.is('updated_at', null) : query.eq('updated_at', snapshot.updated_at);
    const {data, error} = await query.select('id,updated_at').single();
    if (error || !data || data.id !== 'main') throw new Error('لم يتأكد الحفظ. قد تكون البيانات تغيرت أو انقطع الاتصال. أعد المعاينة قبل المحاولة مرة أخرى.');
    return {...snapshot, ...data, products: nextProducts};
  }
  // Recognize the supplied sales-system report by its headers (not its filename).
  // Header positions anchor the columns; repeated titles and page footers are excluded.
  function salesReportRows(items) {
    const useful = items.filter(i => text(i.str) && i.transform);
    const header = label => useful.find(i => nameKey(i.str) === nameKey(label));
    const id = header('رقم الصنف'), name = header('اسم الصنف'), made = header('رقم التصنيع'), unit = header('الوحدة');
    if (!id || !name || !made || !unit) return null;
    const center = i => i.transform[4] + i.width / 2;
    const m = center(made), u = center(unit), nameLeft = m + (m - u) / 2;
    const nameRight = id.transform[4], codeLeft = (m + u) / 2;
    const top = Math.min(id.transform[5], name.transform[5], made.transform[5], unit.transform[5]) - 5;
    const anchors = useful.filter(i => /^\d+$/.test(text(i.str)) && Math.abs(center(i) - center(id)) < 18 && i.transform[5] < top && i.transform[5] > 35)
      .sort((a,b) => b.transform[5] - a.transform[5]);
    if (!anchors.length) return null;
    const join = parts => pdfRows(parts).map(cells => cells.join(' ')).join(' ').normalize('NFKC').replace(/\s+/g,' ').trim();
    return anchors.map((anchor, index) => {
      const y = anchor.transform[5], upper = index ? (anchors[index-1].transform[5]+y)/2 : top;
      const lower = index + 1 < anchors.length ? (anchors[index+1].transform[5]+y)/2 : Math.max(35, y-12);
      const row = useful.filter(i => i.transform[5] < upper && i.transform[5] > lower);
      return [join(row.filter(i => i.transform[4] >= nameLeft && i.transform[4] < nameRight)), text(anchor.str),
        join(row.filter(i => center(i) >= codeLeft && center(i) < nameLeft)),
        join(row.filter(i => Math.abs(center(i) - u) < (m-u)/2))];
    });
  }
  return {MAX_ROWS, fields, text, nameKey, codeKey, fullName, integer, guessColumns, rowsFromMatrix, plan, applyPlan, pdfRows, salesReportRows, commit};
});
