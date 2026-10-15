const {test} = require('node:test');
const assert = require('node:assert/strict');
const numbers = require('../assets/numbers.js');
const C = require('../catalog-import-core.js');
test('all digit sets and mixed identifiers retain letters, case and zeroes', () => {
  for (const value of ['0123456789','٠١٢٣٤٥٦٧٨٩','۰۱۲۳۴۵۶۷۸۹']) assert.equal(numbers.digits(value), '0123456789');
  assert.equal(numbers.digits('MS٠۰۴-abc'), 'MS004-abc');
  assert.equal(numbers.digits('موقد ٠٤'), 'موقد 04');
});
test('quantities are whole safe integers with explicit minimums', () => {
  for (const value of ['12','١٢','۱۲',' ١۲ ']) assert.equal(numbers.integer(value,1),12);
  assert.equal(numbers.integer('٠'),0);
  for (const value of ['', ' ', '-١', '١.٢', '١٫٢', '١e٢','١٢abc','٩٠٠٧١٩٩٢٥٤٧٤٠٩٩٢']) assert.ok(Number.isNaN(numbers.integer(value)));
  assert.ok(Number.isNaN(numbers.integer('٠',1)));
});
test('import normalizes codes and item numbers without mutating source products', () => {
  const row={name:'منتج مستقل',salesCode:'MS٠٠۴',itemNumber:'۰۰۷',boxQty:'١٢',stockQty:'۰',selected:true,targetId:'new'};
  const entries=C.plan([row],[]);
  assert.equal(entries[0].status,'new');
  const result=C.applyPlan([],entries)[0];
  assert.equal(result.salesCode,'MS004'); assert.equal(result.itemNumber,'007');
  assert.equal(result.boxQty,12); assert.equal(result.stockQty,0);
  assert.equal(row.salesCode,'MS٠٠۴');
});
test('equivalent digit forms cannot create duplicate codes or ambiguous matches', () => {
  const row={name:'منتج',salesCode:'MS٠٤',boxQty:'١',selected:true};
  assert.ok(C.plan([row,{...row,name:'آخر',salesCode:'MS۰۴'}],[]).every(e=>e.status==='invalid'));
  const products=[{id:1,name:'منتج',salesCode:'MS04',boxQty:1}];
  assert.equal(C.plan([row],products)[0].status,'unchanged');
  assert.equal(products[0].salesCode,'MS04');
  assert.equal(C.plan([row],[...products,{id:2,name:'آخر',salesCode:'MS۰۴'}])[0].status,'invalid');
  assert.equal(C.nameKey('صنف ۱۲'),C.nameKey('صنف ١٢'));
  assert.equal(C.fullName({name:'منتج — ٠٠٧',itemNumber:'007'}),'منتج — ٠٠٧');
});
