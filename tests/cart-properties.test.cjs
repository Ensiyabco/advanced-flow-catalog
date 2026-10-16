const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
for (const file of ['index.html', 'products.html']) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const code = source.match(/<script id="grouped-order-cart-20261004">([\s\S]*?)<\/script>/)[1];
  const ctx = vm.createContext({}); vm.runInContext(code, ctx);
  const normalize = items => JSON.parse(JSON.stringify(ctx.normalizeOrderCart(items)));
  test(`${file}: normalization preserves quantities, units and source across 1000 seeded carts`, () => {
    let seed = 17417;
    const next = () => (seed = (Math.imul(seed,1664525) + 1013904223) >>> 0);
    for (let run = 0; run < 1000; run++) {
      const items = Array.from({length: next() % 40}, () => ({id: next()%5, name:'صنف', qty: next()%1000+1, unitType: next()%2?'حبة':'كرتون'}));
      const original = JSON.stringify(items), result = normalize(items);
      assert.equal(JSON.stringify(items), original);
      assert.deepEqual(normalize(result), result);
      for (const id of [0,1,2,3,4]) for (const unit of ['حبة','كرتون']) {
        const sum = xs => xs.filter(p => p.id===id && p.unitType===unit).reduce((s,p)=>s+BigInt(p.qty),0n);
        assert.equal(sum(result), sum(items));
      }
    }
  });
  test(`${file}: overflow survives repeated normalization and Arabic quantities retain value`, () => {
    const items = [{id:1,qty:Number.MAX_SAFE_INTEGER,unitType:'حبة'},{id:1,qty:1,unitType:'حبة'},{id:1,qty:'٤',unitType:'كرتون'}];
    const result = normalize(items);
    assert.ok(result.every(x => Number.isSafeInteger(x.qty)));
    assert.equal(result.filter(x=>x.unitType==='حبة').reduce((s,p)=>s+BigInt(p.qty),0n),9007199254740992n);
    assert.deepEqual(normalize(result),result);
    assert.equal(result.find(x=>x.unitType==='كرتون').qty,4);
  });
}
test('adding a quantity beyond the safe total is rejected without saving or changing the cart', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'products.html'), 'utf8');
  const code = source.match(/function addToCart\(prodId\) \{[\s\S]*?(?=\n    function saveCart)/)[0];
  const item = {id:1,qty:Number.MAX_SAFE_INTEGER,quantity:Number.MAX_SAFE_INTEGER,unitType:'حبة'};
  let saved = false, message = '';
  const ctx = vm.createContext({
    cart:[item],products:[{id:1,name:'صنف'}],readOrderQuantity:Number,
    document:{getElementById:id=>({value:id.startsWith('qty-')?'1':'حبة'})},
    saveCart:()=>{saved=true;},updateCartBadge:()=>{},alert:text=>{message=text;}
  });
  vm.runInContext(code,ctx); ctx.addToCart(1);
  assert.equal(item.qty,Number.MAX_SAFE_INTEGER);assert.equal(saved,false);assert.match(message,/كبيرة/);
});
