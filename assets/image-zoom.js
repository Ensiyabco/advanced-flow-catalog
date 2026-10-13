(() => {
  const modal = document.getElementById('image-lightbox');
  const img = document.getElementById('lightbox-img-src');
  if (!modal || !img) return;
  const viewport = document.createElement('div');
  viewport.className = 'ensiyab-image-viewport';
  img.before(viewport); viewport.append(img);
  const controls = document.createElement('div');
  controls.className = 'ensiyab-image-zoom-controls';
  controls.innerHTML = '<button type="button" aria-label="تصغير الصورة">−</button><button type="button" aria-label="إعادة حجم الصورة">100%</button><button type="button" aria-label="تكبير الصورة">+</button>';
  modal.insertBefore(controls, modal.lastElementChild);
  let scale = 1, x = 0, y = 0, previous = null;
  const pointers = new Map();
  const [minus, resetButton, plus] = controls.children;
  function render() {
    const maxX = Math.max(0, (img.offsetWidth * scale - viewport.clientWidth) / 2);
    const maxY = Math.max(0, (img.offsetHeight * scale - viewport.clientHeight) / 2);
    x = Math.max(-maxX, Math.min(maxX, x)); y = Math.max(-maxY, Math.min(maxY, y));
    img.style.transform = `translate(${x}px,${y}px) scale(${scale})`;
    resetButton.textContent = Math.round(scale * 100) + '%';
    minus.disabled = scale <= 1; plus.disabled = scale >= 5;
  }
  function zoom(value, point) {
    const next = Math.max(1, Math.min(5, value));
    if (point) {
      const r = viewport.getBoundingClientRect();
      const cx = point.x - r.left - r.width / 2, cy = point.y - r.top - r.height / 2;
      x = cx - (cx - x) * next / scale; y = cy - (cy - y) * next / scale;
    }
    scale = next; render();
  }
  function reset() { scale = 1; x = y = 0; pointers.clear(); previous = null; render(); }
  minus.onclick = () => zoom(scale / 1.4);
  plus.onclick = () => zoom(scale * 1.4);
  resetButton.onclick = reset;
  function snapshot() {
    const values = [...pointers.values()];
    if (!values.length) return null;
    if (values.length === 1) return {...values[0], distance:0};
    const [a,b] = values;
    return {x:(a.x+b.x)/2, y:(a.y+b.y)/2, distance:Math.hypot(a.x-b.x,a.y-b.y)};
  }
  viewport.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault(); viewport.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY}); previous = snapshot();
  });
  viewport.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    const next = snapshot();
    if (previous && next) {
      x += next.x - previous.x; y += next.y - previous.y;
      if (next.distance && previous.distance) zoom(scale * next.distance / previous.distance, next);
      else render();
    }
    previous = next;
  });
  function release(event) { pointers.delete(event.pointerId); previous = snapshot(); }
  ['pointerup','pointercancel','lostpointercapture'].forEach(type => viewport.addEventListener(type,release));
  viewport.addEventListener('wheel', event => { event.preventDefault(); zoom(scale * (event.deltaY < 0 ? 1.15 : 1/1.15), {x:event.clientX,y:event.clientY}); }, {passive:false});
  viewport.addEventListener('dblclick', event => { if(scale > 1) reset(); else zoom(2,{x:event.clientX,y:event.clientY}); });
  img.draggable = false;
  img.addEventListener('load', reset);
  new MutationObserver(reset).observe(img,{attributes:true,attributeFilter:['src']});
  new MutationObserver(reset).observe(modal,{attributes:true,attributeFilter:['style']});
  window.addEventListener('resize',reset);
  render();
})();
