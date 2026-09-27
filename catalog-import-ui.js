(function () {
  'use strict';
  const C = window.CatalogImport;
  const labels = {name: 'اسم الصنف', itemNumber:'رقم الصنف (يضاف للاسم)', salesCode: 'الكود / الباركود', unit: 'الوحدة', boxQty: 'شد الكرتون', stockQty: 'المخزون'};
  let workbook = null, matrix = [], rows = [], snapshot = null, entries = [], busy = false, page = 0, opener;
  const pageSize = 50;
  const dialog = document.createElement('dialog');
  dialog.id = 'catalog-import-dialog';
  dialog.setAttribute('aria-labelledby', 'bulk-title');
  dialog.innerHTML = `
    <div class="bulk-head"><div><h2 id="bulk-title">استيراد الأصناف</h2><p>بطاقات جديدة بلا أقسام أو صور، وإضافة الكود للأصناف الموجودة.</p></div><button type="button" id="bulk-close" aria-label="إغلاق">×</button></div>
    <div class="bulk-body">
      <div class="bulk-file"><label for="bulk-file">اختر ملف Excel أو PDF</label><input id="bulk-file" type="file" accept=".xlsx,.xls,.csv,.pdf"><button id="bulk-template" type="button">تنزيل نموذج Excel</button></div>
      <p class="bulk-hint">الحد الأقصى 5000 صنف و20 ميجابايت. الصور تُضاف لاحقًا. يدعم PDF النصي؛ الملفات المصوّرة تحتاج تحويلًا إلى نص أولًا.</p>
      <p id="bulk-status" role="status" aria-live="polite"></p>
      <section id="bulk-config" hidden>
        <div class="bulk-options"><label id="bulk-sheet-label">ورقة العمل <select id="bulk-sheet"></select></label><label>أول صف للبيانات <input id="bulk-start" type="number" min="1" value="2"></label></div>
        <p>اربط الأعمدة بالحقول. اسم الصنف فقط إلزامي. القيم الفارغة للأصناف الجديدة: الوحدة «حبة»، شد الكرتون 1، والمخزون غير محدد.</p>
        <div id="bulk-mapping" class="bulk-mapping"></div>
        <details id="bulk-pdf-edit" hidden><summary>مراجعة النص المستخرج من PDF وتعديله</summary><p>كل سطر صنف، والأعمدة مفصولة بزر Tab. احذف عناوين الصفحات أو أصلح النص قبل المعاينة.</p><textarea id="bulk-pdf-text" rows="8" spellcheck="false"></textarea><button id="bulk-apply-text" type="button">اعتماد النص المعدّل</button></details>
        <div class="bulk-scroll"><table><caption>أول خمسة صفوف من الملف</caption><tbody id="bulk-source"></tbody></table></div>
        <button id="bulk-preview" type="button" class="bulk-primary">معاينة ومطابقة الأصناف</button>
      </section>
      <section id="bulk-review" hidden>
        <h3>مراجعة الدفعة</h3><p>رقم الصنف يضاف إلى الاسم، والباركود يحفظ في «الكود». عند التطابق يُحدَّث الاسم والكود والشد، وتبقى الصور والأقسام والمخزون كما هي. راجع الأسماء المتشابهة وحدد المنتج المقصود، أو اختر «صنف جديد».</p>
        <label><input type="checkbox" id="bulk-replace"> السماح باستبدال كود مختلف موجود مسبقًا للأصناف المحددة</label>
        <div class="bulk-options"><label>عرض <select id="bulk-filter"><option value="all">كل الصفوف</option><option value="invalid">تحتاج مراجعة</option><option value="new">أصناف جديدة</option><option value="update">تحديث الكود</option><option value="unchanged">بدون تغيير</option><option value="excluded">مستبعدة</option></select></label><button type="button" id="bulk-exclude-errors">استبعاد الصفوف التي تحتاج مراجعة</button><button type="button" id="bulk-select-all">تحديد الكل</button></div>
        <p id="bulk-summary" aria-live="polite"></p>
        <div class="bulk-scroll"><table><thead><tr><th>استيراد</th><th>صف</th><th>اسم الصنف</th><th>رقم الصنف</th><th>الكود</th><th>الوحدة</th><th>شد الكرتون</th><th>المخزون</th><th>النتيجة والربط</th></tr></thead><tbody id="bulk-rows"></tbody></table></div>
        <div class="bulk-options"><button id="bulk-prev" type="button">السابق</button><span id="bulk-page"></span><button id="bulk-next" type="button">التالي</button></div>
        <label><input type="checkbox" id="bulk-confirm"> راجعت الأسماء والأكواد والصفوف المحددة وأريد حفظها.</label>
        <div class="bulk-footer"><button id="bulk-save" type="button" class="bulk-primary" disabled>حفظ الدفعة</button><button id="bulk-refresh" type="button">تحديث المطابقة من الموقع</button></div>
      </section>
    </div>`;
  document.body.appendChild(dialog);
  const $ = id => document.getElementById('bulk-' + id);
  const status = (message, error = false) => { $('status').textContent = message; $('status').className = error ? 'bulk-error' : ''; };
  function setBusy(value) {
    busy = value;
    dialog.querySelectorAll('button,input,select,textarea').forEach(el => { el.disabled = value; });
    if (!value) updateSave();
  }
  function updateSave() {
    $('save').disabled = busy || !$('confirm').checked || !snapshot || entries.some(e => e.status === 'invalid') || !entries.some(e => ['new','update'].includes(e.status));
  }
  function invalidate() { rows = []; entries = []; snapshot = null; $('review').hidden = true; $('confirm').checked = false; updateSave(); }
  const tick = () => new Promise(resolve => setTimeout(resolve, 0));
  let xlsxPromise;
  function xlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (!xlsxPromise) xlsxPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
      script.onload = () => window.XLSX ? resolve(window.XLSX) : reject(new Error('تعذر تحميل قارئ Excel.'));
      script.onerror = () => { script.remove(); xlsxPromise = null; reject(new Error('تعذر تحميل قارئ Excel. أعد المحاولة.')); };
      document.head.appendChild(script);
    });
    return xlsxPromise;
  }
  let pdfPromise;
  function pdfjs() {
    if (!pdfPromise) pdfPromise = import('https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/legacy/build/pdf.mjs').then(pdf => {
      pdf.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/legacy/build/pdf.worker.mjs'; return pdf;
    }).catch(error => { pdfPromise = null; throw error; });
    return pdfPromise;
  }
  async function readPdf(file) {
    const pdf = await pdfjs();
    const task = pdf.getDocument({data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, useSystemFonts: true});
    try {
      const doc = await task.promise;
      if (doc.numPages > 100) throw new Error('الحد الأقصى 100 صفحة. قسّم PDF إلى ملفات أصغر.');
      const pages = [];
      for (let n=1; n<=doc.numPages; n++) {
        status('قراءة PDF: صفحة ' + n + ' من ' + doc.numPages);
        const p = await doc.getPage(n), content = await p.getTextContent();
        if (!content.items.some(i => C.text(i.str))) throw new Error('الصفحة ' + n + ' لا تحتوي نصًا قابلًا للاستخراج. استخدم نسخة نصية أو Excel؛ لم تُجهَّز دفعة جزئية.');
        pages.push(content.items); p.cleanup(); await tick();
      }
      const reports = pages.map(C.salesReportRows);
      if (reports.every(Boolean)) return [['اسم الصنف','رقم الصنف','رقم التصنيع','الوحدة'], ...reports.flat()];
      return pages.flatMap(C.pdfRows);
    } finally { await task.destroy(); }
  }
  function configure(data) {
    matrix = data; invalidate();
    if (!matrix.length) throw new Error('لم يُعثر على صفوف في الملف.');
    if (matrix.length > C.MAX_ROWS + 100) throw new Error('الملف يتجاوز 5000 صنف. قسّمه إلى دفعات.');
    const width = Math.max(...matrix.map(r => r.length));
    if (width > 100) throw new Error('عدد الأعمدة كبير جدًا. احتفظ بأعمدة بيانات الأصناف فقط.');
    const headerIndex = matrix.slice(0,20).findIndex(row=>C.guessColumns(row).name>=0);
    const header = matrix[Math.max(0,headerIndex)];
    const mapping = C.guessColumns(header);
    $('start').value = headerIndex >= 0 ? headerIndex+2 : 1;
    $('mapping').replaceChildren();
    for (const field of C.fields) {
      const label = document.createElement('label'); label.textContent = labels[field];
      const select = document.createElement('select'); select.id = 'bulk-map-' + field;
      select.add(new Option(field === 'name' ? 'اختر العمود' : 'غير موجود', '-1'));
      for (let i=0;i<width;i++) select.add(new Option((i+1)+': '+(C.text(header[i]).slice(0,55) || 'عمود بلا عنوان'), String(i)));
      select.value = String(mapping[field]); select.onchange = invalidate; label.appendChild(select); $('mapping').appendChild(label);
    }
    $('source').replaceChildren();
    matrix.slice(Math.max(0,headerIndex),Math.max(0,headerIndex)+5).forEach((row,index) => {
      const tr = document.createElement('tr'); const th = document.createElement('th'); th.textContent=String(Math.max(0,headerIndex)+index+1);tr.append(th);
      for (const value of row) { const td=document.createElement('td');td.textContent=C.text(value);tr.append(td); } $('source').append(tr);
    });
    $('config').hidden = false;
    status('تمت قراءة '+matrix.length+' صفًا. تحقق من عمودي الاسم والكود قبل المعاينة.');
  }
  function sheetMatrix() {
    const sheet = workbook.Sheets[$('sheet').value];
    // raw:false retains formatted IDs such as 000123; numeric cells already rounded
    // by Excel cannot be reconstructed. Codes should be stored as text at source.
    return window.XLSX.utils.sheet_to_json(sheet, {header:1, raw:false, defval:'', blankrows:true});
  }
  $('file').onchange = async () => {
    const file = $('file').files[0]; if (!file) return;
    invalidate(); $('config').hidden = true; workbook = null; setBusy(true);
    try {
      if (file.size > 20*1024*1024) throw new Error('حجم الملف أكبر من 20 ميجابايت.');
      const isPdf = /\.pdf$/i.test(file.name);
      $('pdf-edit').hidden = !isPdf; $('sheet-label').hidden = isPdf;
      if (isPdf) {
        const data = await readPdf(file); $('pdf-text').value = data.map(r=>r.join('\t')).join('\n'); configure(data);
      } else {
        if (!/\.(xlsx|xls|csv)$/i.test(file.name)) throw new Error('اختر ملف Excel أو CSV أو PDF.');
        status('قراءة Excel…'); const lib = await xlsx();
        workbook = lib.read(await file.arrayBuffer(), {type:'array', cellText:true, cellDates:false, sheetRows:C.MAX_ROWS+102});
        $('sheet').replaceChildren(); workbook.SheetNames.forEach(name=>$('sheet').add(new Option(name,name)));
        configure(sheetMatrix());
      }
    } catch(error) { status(error.message || 'تعذر قراءة الملف.', true); }
    finally { setBusy(false); }
  };
  $('sheet').onchange = () => { try { configure(sheetMatrix()); } catch(e) { invalidate();status(e.message,true); } };
  $('start').onchange = invalidate;
  $('apply-text').onclick = () => { try { configure($('pdf-text').value.split(/\r?\n/).map(line=>line.split('\t'))); } catch(e) {status(e.message,true);} };
  async function fetchSnapshot() {
    const cloud = window.ANSIYAB_CLOUD;
    if (!window.CatalogImportHost?.isAdmin() || !cloud?.client) throw new Error('يلزم دخول المشرف والاتصال بالموقع.');
    if (!(await cloud.signIn())) throw new Error('لم يكتمل تسجيل دخول المشرف.');
    const {data,error} = await cloud.client.from('catalog_state').select('id,products,updated_at').eq('id','main').single();
    if (error || !data || !Array.isArray(data.products)) throw new Error('تعذر جلب الأصناف من الموقع. لم تُستخدم نسخة قديمة للمطابقة.');
    return data;
  }
  async function preview(refresh = false) {
    setBusy(true); $('confirm').checked = false;
    try {
      if (!refresh) {
        const mapping = Object.fromEntries(C.fields.map(f=>[f, Number($('map-'+f).value)]));
        const start = Number($('start').value);
        if (!Number.isInteger(start) || start<1 || start>matrix.length) throw new Error('حدد أول صف للبيانات داخل نطاق الملف.');
        rows = C.rowsFromMatrix(matrix, mapping, start-1);
        if (!rows.length) throw new Error('لا توجد أصناف في الصفوف المحددة.');
      }
      snapshot = await fetchSnapshot(); page=0; $('review').hidden = false; render();
      status('المعاينة جاهزة. لم يُحفظ أي تغيير بعد.');
    } catch(e) {snapshot=null;status(e.message,true);}
    finally {setBusy(false);}
  }
  function render() {
    if (!snapshot) return;
    entries = C.plan(rows, snapshot.products, $('replace').checked);
    const counts = {new:0,update:0,unchanged:0,invalid:0,excluded:0}; entries.forEach(e=>counts[e.status]++);
    $('summary').textContent = `جديدة: ${counts.new} • تحديث الكود: ${counts.update} • بدون تغيير: ${counts.unchanged} • تحتاج مراجعة: ${counts.invalid} • مستبعدة: ${counts.excluded}`;
    const filtered = entries.filter(e=>$('filter').value==='all' || e.status===$('filter').value);
    page = Math.min(page, Math.max(0,Math.ceil(filtered.length/pageSize)-1));
    $('rows').replaceChildren();
    for (const entry of filtered.slice(page*pageSize,(page+1)*pageSize)) {
      const tr = document.createElement('tr'); tr.className='bulk-row-'+entry.status;
      const td = document.createElement('td'), check = document.createElement('input'); check.type='checkbox';check.checked=entry.row.selected!==false;check.setAttribute('aria-label','استيراد الصف '+entry.row.sourceRow);
      check.onchange=()=>{entry.row.selected=check.checked;$('confirm').checked=false;render();};td.append(check);tr.append(td);
      const number=document.createElement('td');number.textContent=entry.row.sourceRow;tr.append(number);
      for (const field of C.fields) {
        const cell=document.createElement('td'), input=document.createElement('input');input.type='text';input.value=entry.row[field];input.setAttribute('aria-label',labels[field]+' للصف '+entry.row.sourceRow);
        if(field==='salesCode')input.dir='ltr';
        input.onchange=()=>{entry.row[field]=input.value;$('confirm').checked=false;render();};cell.append(input);tr.append(cell);
      }
      const result=document.createElement('td');result.textContent=entry.message;
      const finalName=document.createElement('p');finalName.textContent='الاسم النهائي: '+(entry.changes?.name || C.fullName(entry.row));result.append(finalName);
      const match=document.createElement('select');match.setAttribute('aria-label','ربط الصف '+entry.row.sourceRow);
      match.add(new Option('مطابقة تلقائية',''));match.add(new Option('صنف جديد','new'));
      const suggested=new Set((entry.suggestions||[]).map(p=>p.id));
      const ordered=[...snapshot.products].sort((a,b)=>Number(suggested.has(b.id))-Number(suggested.has(a.id)));
      for(const p of ordered)match.add(new Option(p.name+' ['+p.id+']',String(p.id)));
      match.value=entry.row.targetId||'';match.onchange=()=>{entry.row.targetId=match.value;$('confirm').checked=false;render();};
      result.append(match);tr.append(result);$('rows').append(tr);
    }
    $('page').textContent=`صفحة ${page+1} من ${Math.max(1,Math.ceil(filtered.length/pageSize))}`;
    $('prev').disabled=page===0;$('next').disabled=(page+1)*pageSize>=filtered.length;updateSave();
  }
  $('preview').onclick=()=>preview();$('refresh').onclick=()=>preview(true);
  $('filter').onchange=()=>{page=0;render();};$('replace').onchange=()=>{$('confirm').checked=false;render();};
  $('prev').onclick=()=>{page--;render();};$('next').onclick=()=>{page++;render();};$('confirm').onchange=updateSave;
  $('exclude-errors').onclick=()=>{entries.filter(e=>e.status==='invalid').forEach(e=>e.row.selected=false);$('confirm').checked=false;render();};
  $('select-all').onclick=()=>{rows.forEach(r=>r.selected=true);$('confirm').checked=false;render();};
  $('save').onclick=async()=>{
    if (busy || $('save').disabled) return;
    setBusy(true);
    try {
      const latest = await fetchSnapshot();
      if (JSON.stringify(latest.products)!==JSON.stringify(snapshot.products)) {
        snapshot=latest;$('confirm').checked=false;render();throw new Error('تغيّرت أصناف الموقع منذ المعاينة. حُدّثت المطابقة؛ راجعها وأكّد الحفظ مجددًا.');
      }
      const current = C.plan(rows,latest.products,$('replace').checked);
      const countNew=current.filter(e=>e.status==='new').length, countUpdate=current.filter(e=>e.status==='update').length;
      if (!countNew && !countUpdate) throw new Error('لا توجد تغييرات للحفظ.');
      const next=C.applyPlan(latest.products,current);
      const saved=await C.commit(window.ANSIYAB_CLOUD.client,latest,next);
      // Update local caches only after the server confirms the conditional write.
      window.CatalogImportHost.accept(saved);snapshot=saved;$('confirm').checked=false;render();
      status(`تم الحفظ: ${countNew} بطاقة جديدة، وتحديث الاسم والكود والشد لـ ${countUpdate} منتج. يمكنك إغلاق النافذة وإضافة الصور لاحقًا.`);
    } catch(e) { $('confirm').checked=false;status(e.message,true); }
    finally {setBusy(false);}
  };
  $('template').onclick=async()=>{
    setBusy(true);
    try { const lib=await xlsx(), book=lib.utils.book_new();const sheet=lib.utils.aoa_to_sheet([['اسم الصنف','رقم الصنف','باركود','الوحدة','شد الطرد','المخزون'],['موقد رحلات SM-34040','AG01','00123','حبة','1','']]);sheet['!cols']=[{wch:40},{wch:20},{wch:22},{wch:12},{wch:15},{wch:15}];lib.utils.book_append_sheet(book,sheet,'الأصناف');lib.writeFile(book,'نموذج-الأصناف.xlsx'); }
    catch(e){status(e.message,true);}finally{setBusy(false);}
  };
  function close(){if(busy)return;dialog.close();opener?.focus();}
  $('close').onclick=close;dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  window.openCatalogImport=()=>{if(!window.CatalogImportHost?.isAdmin())return;opener=document.activeElement;dialog.showModal();$('file').focus();};
  window.addEventListener('beforeunload',event=>{if(busy){event.preventDefault();event.returnValue='';}});
})();
