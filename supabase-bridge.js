(function(){
  const cfg = window.ANSIYAB_SUPABASE || {};
  const client = (window.supabase && cfg.url && cfg.publishableKey)
    ? window.supabase.createClient(cfg.url, cfg.publishableKey)
    : null;
  window.ANSIYAB_CLOUD = { client, state: null, loaded: false, loading: null };

  function local(key, fallback){
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch(e){ return fallback; }
  }
  function saveLocal(key, value){ try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){} }

  const homePage = /\/$|\/index\.html$/.test(location.pathname);
  // Visitors and admins read the same cloud catalog; RLS still restricts writes to authenticated users.
  const readColumns = 'id,categories,products,store_settings,updated_at';

  async function load(){
    if(!client) return null;
    if(window.ANSIYAB_CLOUD.loading) return window.ANSIYAB_CLOUD.loading;
    window.ANSIYAB_CLOUD.loading = (async()=>{
      const {data, error} = await client.from('catalog_state').select(readColumns).eq('id','main').maybeSingle();
      if(error){ console.warn('Supabase read failed:', error.message); return null; }
      if(!data){ return null; }
      const hasCloudData = (Array.isArray(data.categories) && data.categories.length) || (Array.isArray(data.products) && data.products.length);
      if(hasCloudData){
        window.ANSIYAB_CLOUD.state = data;
        saveLocal('ansiyab_categories_v1', data.categories || []);
        if (Array.isArray(data.products)) {
          saveLocal('ansiyab_products_v7', data.products);
          saveLocal('ansiyab_products', data.products);
        }
        const s = data.store_settings || {};
        if(s._categoryImages) saveLocal('ansiyab_cat_images', s._categoryImages);
        if(s._subCategoryMeta) saveLocal('ansiyab_subcategory_meta_v1', s._subCategoryMeta);
        const cleanSettings = Object.assign({}, s); delete cleanSettings._categoryImages; delete cleanSettings._subCategoryMeta;
        saveLocal('ansiyab_store_settings', cleanSettings);
      }
      window.ANSIYAB_CLOUD.loaded = true;
      window.dispatchEvent(new CustomEvent('ansiyab-cloud-loaded', { detail: data }));
      return data;
    })().finally(()=>{ window.ANSIYAB_CLOUD.loading = null; });
    return window.ANSIYAB_CLOUD.loading;
  }

  async function signIn(){
    if(!client) return false;
    const sessionResult = await client.auth.getSession();
    if(sessionResult.data && sessionResult.data.session) return true;
    return new Promise(resolve => {
      const dialog = document.createElement('dialog');
      dialog.dir = 'rtl';
      dialog.setAttribute('aria-labelledby', 'ensiyab-login-title');
      dialog.style.cssText = 'box-sizing:border-box;width:min(420px,calc(100% - 24px));max-height:85dvh;overflow:auto;border:0;border-radius:18px;padding:24px;color:#173b63;background:white;font-family:inherit;';
      dialog.innerHTML = `<form style="display:grid;gap:14px">
        <h2 id="ensiyab-login-title" style="margin:0;font-size:22px">دخول المشرف</h2>
        <label style="display:grid;gap:6px">البريد الإلكتروني<input name="email" type="email" dir="ltr" autocomplete="username" required style="box-sizing:border-box;width:100%;padding:12px;border:1px solid #aab8c8;border-radius:8px;font-size:16px"></label>
        <label style="display:grid;gap:6px">كلمة المرور<input name="password" type="password" dir="ltr" autocomplete="current-password" required style="box-sizing:border-box;width:100%;padding:12px;border:1px solid #aab8c8;border-radius:8px;font-size:16px"></label>
        <p role="alert" style="margin:0;color:#a32121;overflow-wrap:anywhere"></p>
        <button type="submit" style="min-height:46px;background:#173b63;color:white;border:0;border-radius:8px;font:inherit">دخول</button>
        <button type="button" style="min-height:44px;border:1px solid #aab8c8;border-radius:8px;background:white;font:inherit">إلغاء</button>
      </form>`;
      const form = dialog.querySelector('form'), submit = form.querySelector('[type="submit"]');
      let busy = false, finished = false;
      const finish = result => { if(finished) return; finished = true; form.reset(); dialog.close(); dialog.remove(); resolve(result); };
      dialog.addEventListener('cancel', event => { event.preventDefault(); if(!busy) finish(false); });
      form.querySelector('[type="button"]').onclick = () => { if(!busy) finish(false); };
      form.addEventListener('submit', async event => {
        event.preventDefault(); if(busy) return;
        busy = true; submit.disabled = true; submit.textContent = 'جارٍ تسجيل الدخول…';
        const message = form.querySelector('[role="alert"]'); message.textContent = '';
        try {
          const {data, error} = await client.auth.signInWithPassword({email: form.elements.email.value.trim(), password: form.elements.password.value});
          if(error || !data?.session) { message.textContent = 'تعذر الدخول. تحقق من البريد وكلمة المرور ثم حاول مجددًا.'; }
          else { finish(true); return; }
        } catch(error) { message.textContent = 'تعذر الاتصال. تحقق من الإنترنت ثم حاول مجددًا.'; }
        busy = false; submit.disabled = false; submit.textContent = 'دخول';
      });
      document.body.append(dialog); dialog.showModal();
    });
  }

  async function push(overrides){
    if(!client) return false;
    const ok = await signIn();
    if(!ok) return false;
    const categories = overrides && Array.isArray(overrides.categories) ? overrides.categories : local('ansiyab_categories_v1', []);
    const supplied = overrides && Array.isArray(overrides.products) ? overrides.products : null;
    const live = typeof window.ANSIYAB_CLOUD.getProducts === 'function' ? window.ANSIYAB_CLOUD.getProducts() : null;
    const products = supplied || (Array.isArray(live) ? live : (window.ANSIYAB_CLOUD.state?.products || local('ansiyab_products_v7', local('ansiyab_products', []))));
    const settings = local('ansiyab_store_settings', {});
    const categoryImages = overrides && overrides.categoryImages && typeof overrides.categoryImages === 'object' ? overrides.categoryImages : local('ansiyab_cat_images', {});
    const subCategoryMeta = local('ansiyab_subcategory_meta_v1', {});
    const storeSettings = Object.assign({}, settings, {_categoryImages: categoryImages, _subCategoryMeta: subCategoryMeta});
    const payload = {categories, store_settings:storeSettings, updated_at:new Date().toISOString()};
    if (!homePage || supplied) payload.products=products;
    const {data,error}=await client.from('catalog_state').update(payload)
      .eq('id','main').select(readColumns).single();
    if(error){ alert('تعذر حفظ البيانات في Supabase:\n' + error.message); return false; }
    window.ANSIYAB_CLOUD.state = data;
    window.ANSIYAB_CLOUD.loaded = true;
    return true;
  }

  window.ANSIYAB_CLOUD.load = load;
  window.ANSIYAB_CLOUD.push = push;
  window.ANSIYAB_CLOUD.signIn = signIn;

  window.addEventListener('DOMContentLoaded', async function(){
    const data = await load();
    if(data && ((data.categories||[]).length || (data.products||[]).length)){
      setTimeout(function(){
        try { if(typeof window.buildCategoryAccordion==='function') window.buildCategoryAccordion(); } catch(e){}
        try { if(typeof window.buildHomeCategories==='function') window.buildHomeCategories(); } catch(e){}
        try { if(typeof window.applyStoreSettings==='function') window.applyStoreSettings(); } catch(e){}
        try { if(typeof window.refreshHeroFromCloud==='function') window.refreshHeroFromCloud(); } catch(e){}
        try {
          const params = new URLSearchParams(window.location.search);
          const hasCatalogView =
            params.has('cat') || params.has('sub') || params.has('search');

          if (hasCatalogView && typeof window.openCategoryFromUrl === 'function') {
            window.openCategoryFromUrl();
          } else if (
            typeof window.getCurrentVisibleProducts === 'function' &&
            typeof window.renderProducts === 'function'
          ) {
            window.renderProducts(
              window.getCurrentVisibleProducts(),
              document.getElementById('current-view-title')?.innerText || 'جميع المنتجات'
            );
          }
        } catch(e){}
      }, 0);
    }
  });
})();