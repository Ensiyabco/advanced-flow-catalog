const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const Alosh = require('../assets/alosh-core.js');

// Minimal DOM adapter executes the production controller unchanged.
function setup(writeText = async () => {}) {
  class Element {
    constructor() {this.handlers = {}; this.children = []; this.value = ''; this.textContent = ''; this.disabled = false; this.files = [];}
    addEventListener(name, callback) {this.handlers[name] = callback;}
    fire(name) {return this.handlers[name]?.({preventDefault() {}});}
    replaceChildren() {this.children = [];}
    appendChild(child) {this.children.push(child);}
    requestSubmit() {return this.fire('submit');}
    focus() {}
  }
  const nodes = Object.fromEntries(['catalog','catalog-status','reply','matches','prepare','query','lookup','copy-reply','copy-status'].map(id=>[id,new Element()]));
  const context = vm.createContext({window:{Alosh}, navigator:{clipboard:{writeText}}, document:{getElementById:id=>nodes[id],createElement:()=>new Element()}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/alosh-lab.js'),'utf8'),context);
  const load = async data => {nodes.catalog.files = [{size:100,text:async()=>JSON.stringify(data)}]; await nodes.catalog.fire('change');};
  const search = value => {nodes.query.value = value;nodes.query.fire('input');nodes.lookup.fire('submit');};
  return {nodes,load,search};
}
const products = [{id:1,name:'محبس 1/2 بوصة'},{id:2,name:'محبس 1.2 بوصة'}];
test('ambiguous choices require selection; editing query invalidates the copyable draft', async () => {
  let copied;
  const {nodes,load,search} = setup(async text=>{copied=text;});
  await load(products);search('محبس');
  assert.equal(nodes['copy-reply'].disabled,true);assert.equal(nodes.matches.children.length,2);
  nodes.matches.children[0].children[0].fire('click');
  assert.equal(nodes['copy-reply'].disabled,false);
  await nodes['copy-reply'].fire('click');assert.match(copied,/1\/2/);
  nodes.query.value = 'محبس 1.2 بوصة';nodes.query.fire('input');
  assert.equal(nodes['copy-reply'].disabled,true);assert.equal(nodes['copy-status'].textContent,'');
  copied = null;await nodes['copy-reply'].fire('click');assert.equal(copied,null);
});
test('file replacement invalidates the draft; invalid files cannot reuse old catalog', async () => {
  const {nodes,load,search} = setup();await load(products);search(products[0].name);
  nodes.catalog.files = [{size:10,text:async()=>'invalid'}];await nodes.catalog.fire('change');
  assert.equal(nodes.prepare.disabled,true);assert.equal(nodes['copy-reply'].disabled,true);
  search(products[0].name);assert.equal(nodes['copy-reply'].disabled,true);
});
test('clipboard denial is recoverable; old async completion cannot confirm a newer draft', async () => {
  const rejected = setup(async()=>{throw new Error('denied');});await rejected.load(products);rejected.search(products[0].name);
  await rejected.nodes['copy-reply'].fire('click');assert.match(rejected.nodes['copy-status'].textContent,/يدويًا/);
  let complete;
  const pending = setup(()=>new Promise(resolve=>{complete=resolve;}));await pending.load(products);pending.search(products[0].name);
  const copying = pending.nodes['copy-reply'].fire('click');pending.search(products[1].name);complete();await copying;
  assert.equal(pending.nodes['copy-status'].textContent,'');
});
