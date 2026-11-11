/* ==========================================================
   حركات الأنسياب المتقدم (GSAP)
   1) دخول ناعم للصفحة   2) انتقال ناعم بين الصفحات
   3) دخول عنوان الواجهة  4) نبضة أيقونة السلة عند الإضافة
   - لو لم يتحمّل GSAP (بدون إنترنت مثلاً) يعمل الموقع عادياً بدون حركة.
   - من فعّل "تقليل الحركة" في جهازه لا يرى أي حركة.
   ========================================================== */
(function () {
  if (!window.gsap) return;
  var gsap = window.gsap;
  var mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", function () {
    var realMain = document.querySelector("main");
    var main = realMain || document.body;
    var lift = realMain ? 10 : 0; /* لا نحرّك جسم الصفحة كاملاً حتى لا تهتز الأشرطة الثابتة */

    /* 1) دخول الصفحة */
    gsap.from(main, { autoAlpha: 0, y: lift, duration: 0.45, ease: "power2.out", clearProps: "all" });

    /* 3) عنوان الواجهة يدخل مرة واحدة عند فتح الصفحة */
    function heroIn() {
      var hero = document.querySelector(".hero-slide.active .hero-slide-content");
      if (hero) gsap.from(hero.children, {
        autoAlpha: 0, y: 18, duration: 0.6, ease: "power3.out", stagger: 0.08, delay: 0.1, clearProps: "all"
      });
    }
    /* الواجهة تُبنى بعد تحميل الصفحة، فننتظرها */
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(heroIn, 0); });
    else heroIn();

    /* 4) نبضة السلة كلما زاد عدد المنتجات */
    var badge = document.getElementById("cart-count");
    if (badge) {
      var last = parseInt(badge.textContent, 10) || 0;
      new MutationObserver(function () {
        var now = parseInt(badge.textContent, 10) || 0;
        if (now > last) {
          var icon = badge.closest("button, a") || badge;
          gsap.fromTo(icon, { scale: 1 }, { scale: 1.18, duration: 0.16, yoyo: true, repeat: 1, ease: "power2.out", transformOrigin: "50% 50%" });
          gsap.fromTo(badge, { scale: 0.6 }, { scale: 1, duration: 0.4, ease: "back.out(3)" });
        }
        last = now;
      }).observe(badge, { childList: true, characterData: true, subtree: true });
    }

    /* 2) الانتقال بين الصفحات: تلاشٍ سريع قبل فتح الصفحة التالية */
    function onClick(e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      var url;
      try { url = new URL(a.href, location.href); } catch (_) { return; }
      if (url.origin !== location.origin) return;                       /* واتساب والروابط الخارجية تبقى كما هي */
      if (url.pathname === location.pathname && url.search === location.search) return; /* روابط داخل نفس الصفحة */
      if (!/\.html?$|\/$/.test(url.pathname)) return;                    /* ملفات وصور تفتح عادي */
      e.preventDefault();
      gsap.to(main, {
        autoAlpha: 0, y: lift ? -6 : 0, duration: 0.18, ease: "power1.in",
        onComplete: function () { location.href = url.href; }
      });
      setTimeout(function () { location.href = url.href; }, 400); /* أمان: لا تتأخر أبداً */
    }
    document.addEventListener("click", onClick);

    /* عند الرجوع بزر الخلف تظهر الصفحة فوراً */
    function onShow(ev) { if (ev.persisted) gsap.set(main, { clearProps: "all" }); }
    window.addEventListener("pageshow", onShow);

    return function () {
      document.removeEventListener("click", onClick);
      window.removeEventListener("pageshow", onShow);
    };
  });
})();
