// Runs Stride's real core.js in a sandbox with a fake Android storage, and checks the data-loss fixes.
// Usage: node tools/test/db.test.js [path to core.js]
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
assert.deepStrictEqual = (a, b, m) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b), m); // values cross a vm realm

const CORE = fs.readFileSync(process.argv[2] || path.join(__dirname, '../../app/src/main/assets/www/js/core.js'), 'utf8');

function fakeNative(files = {}, opts = {}) {
  const n = {
    files: { ...files }, saves: [],
    load(k) {
      if ((opts.unreadable || []).includes(k)) return null;
      return k in n.files ? n.files[k] : '';
    },
    save(k, v) {
      n.saves.push(k);
      if ((opts.failSave || []).includes(k)) return false;
      n.files[k] = v; return true;
    },
    quarantine(k) {
      if (opts.failQuarantine) return false;
      if (k in n.files) { n.files[k + '.damaged'] = n.files[k]; delete n.files[k]; }
      return true;
    },
    setVoice() {}, toast() {},
  };
  return n;
}

function boot(native) {
  const el = { textContent: '', classList: { add() {}, remove() {}, contains: () => false } };
  const ctx = {
    window: { Android: native }, document: { querySelector: () => el, querySelectorAll: () => [] },
    console, setTimeout, clearTimeout, Date, Math, JSON,
  };
  vm.createContext(ctx);
  vm.runInContext(CORE + '\n;globalThis.__t = { DB, App };', ctx);
  const t = ctx.__t;
  t.toasts = [];
  t.App.toast = m => t.toasts.push(m);
  t.DB.init();
  return t;
}

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('missing files start with defaults and no warning', () => {
  const n = fakeNative();
  const { DB } = boot(n);
  assert.deepStrictEqual(DB.problems, []);
  assert.deepStrictEqual(DB.get('entries'), []);
  assert.strictEqual(DB.get('settings').restSec, 15);
  assert.strictEqual(n.saves.length, 0, 'start-up must not write anything');
});

test('valid data loads; settings merge with defaults; null plan is fine', () => {
  const n = fakeNative({ entries: '[{"id":"a"}]', settings: '{"name":"B"}', plan: 'null' });
  const { DB } = boot(n);
  assert.deepStrictEqual(DB.problems, []);
  assert.strictEqual(DB.get('entries')[0].id, 'a');
  assert.strictEqual(DB.get('settings').name, 'B');
  assert.strictEqual(DB.get('settings').restSec, 15);
  assert.strictEqual(DB.get('plan'), null);
});

test('F-001: invalid JSON is moved aside, not overwritten by the next save', () => {
  const n = fakeNative({ entries: '[{"id":"a"},{"id":' });
  const { DB } = boot(n);
  assert.deepStrictEqual(DB.problems, ['entries']);
  assert.strictEqual(n.files['entries.damaged'], '[{"id":"a"},{"id":');
  DB.set('entries', [{ id: 'new' }]);
  assert.strictEqual(n.files['entries.damaged'], '[{"id":"a"},{"id":', 'damaged copy survives');
  assert.strictEqual(n.files.entries, '[{"id":"new"}]');
});

test('F-009: valid JSON of the wrong shape is treated as damaged', () => {
  for (const [k, raw] of [['entries', '{"id":"a"}'], ['settings', '[1,2]'], ['diary', '"text"']]) {
    const n = fakeNative({ [k]: raw });
    const { DB } = boot(n);
    assert.deepStrictEqual(DB.problems, [k], k);
    assert.strictEqual(n.files[k + '.damaged'], raw, k);
    assert.ok(DB.shapeOk(k, DB.get(k)), k + ' falls back to a usable default');
  }
});

test('F-008: an unreadable file is treated as damaged, not as empty', () => {
  const n = fakeNative({ entries: '[{"id":"a"}]' }, { unreadable: ['entries'] });
  const { DB } = boot(n);
  assert.deepStrictEqual(DB.problems, ['entries']);
  assert.strictEqual(n.files['entries.damaged'], '[{"id":"a"}]');
});

test('F-008: the bridge marker for an unreadable file is treated as damaged', () => {
  const n = fakeNative({ entries: '\u0000unreadable' });
  const { DB } = boot(n);
  assert.deepStrictEqual(DB.problems, ['entries']);
  assert.ok('entries.damaged' in n.files);
});

test('a damaged file that cannot be moved aside is never written over', () => {
  const n = fakeNative({ entries: 'garbage' }, { failQuarantine: true });
  const t = boot(n);
  assert.ok(t.DB.locked.entries);
  assert.strictEqual(t.DB.save('entries'), false);
  assert.strictEqual(n.files.entries, 'garbage');
  assert.match(t.toasts.pop(), /damaged/);
});

test('F-002: a failed save is reported and retried on the next save', () => {
  const opts = { failSave: ['entries'] };
  const n = fakeNative({}, opts);
  const t = boot(n);
  t.DB.set('entries', [{ id: 'x' }]);
  assert.match(t.toasts.pop(), /Couldn't save/);
  assert.ok(t.DB.unsaved.entries);
  opts.failSave = [];          // storage frees up
  t.DB.set('goals', { a: 1 }); // any later save retries the failed one
  assert.strictEqual(n.files.entries, '[{"id":"x"}]');
  assert.deepStrictEqual(t.DB.unsaved, {});
  assert.strictEqual(t.toasts.length, 0);
});

const backup = extra => JSON.stringify(Object.assign({ app: 'stride', version: 1, entries: [{ id: 'b' }], goals: { g: 1 }, settings: { name: 'R' } }, extra));

test('restore writes every key and keeps defaults merged into settings', () => {
  const n = fakeNative({ entries: '[{"id":"old"}]' });
  const { DB } = boot(n);
  DB.importAll(backup());
  assert.strictEqual(n.files.entries, '[{"id":"b"}]');
  assert.strictEqual(JSON.parse(n.files.settings).restSec, 15);
  assert.strictEqual(DB.get('settings').name, 'R');
});

test('restore rejects a wrong-shaped backup before changing anything', () => {
  const n = fakeNative({ entries: '[{"id":"old"}]' });
  const { DB } = boot(n);
  assert.throws(() => DB.importAll(backup({ goals: [] })), /Invalid backup data: goals/);
  assert.strictEqual(DB.get('entries')[0].id, 'old');
  assert.strictEqual(n.saves.length, 0);
});

test('F-005: a save failure during restore puts the old data back', () => {
  const opts = {};
  const n = fakeNative({ entries: '[{"id":"old"}]', goals: '{"old":1}' }, opts);
  const { DB } = boot(n);
  opts.failSave = ['goals'];
  assert.throws(() => DB.importAll(backup()), e => e.saveFailed === true);
  assert.strictEqual(DB.get('entries')[0].id, 'old', 'memory rolled back');
  assert.strictEqual(n.files.entries, '[{"id":"old"}]', 'disk rolled back');
  assert.strictEqual(n.files.goals, '{"old":1}');
  assert.deepStrictEqual(DB.get('goals'), { old: 1 });
});

test('restore can replace a damaged file that could not be moved aside', () => {
  const n = fakeNative({ entries: 'garbage' }, { failQuarantine: true });
  const { DB } = boot(n);
  DB.importAll(backup());
  assert.strictEqual(n.files.entries, '[{"id":"b"}]');
  assert.ok(!DB.locked.entries);
});

test('a failed restore keeps protecting a damaged file it could not replace', () => {
  const n = fakeNative({ entries: 'garbage' }, { failQuarantine: true, failSave: ['entries'] });
  const { DB } = boot(n);
  assert.throws(() => DB.importAll(backup()), e => e.saveFailed);
  assert.strictEqual(n.files.entries, 'garbage');
  assert.ok(DB.locked.entries);
});

test('the import handler explains a failed save differently from a bad file', () => {
  const opts = {};
  const n = fakeNative({}, opts);
  const t = boot(n);
  t.App.popAll = () => {}; t.App.go = () => {};
  t.App.emit('native:import', 'not json');
  assert.match(t.toasts.pop(), /isn't a STRIDE backup/);
  opts.failSave = ['entries'];
  t.App.emit('native:import', backup());
  assert.match(t.toasts.pop(), /nothing was changed/);
  opts.failSave = [];
  t.App.emit('native:import', backup());
  assert.strictEqual(t.toasts.pop(), 'Backup restored');
});

test('the start-up warning names the damaged data', () => {
  const n = fakeNative({ diary: '[]' });
  const t = boot(n);
  let html = '';
  t.App.sheet = render => { const s = { set innerHTML(v) { html = v; }, querySelector: () => ({}) }; render(s); };
  t.App.dataWarning();
  assert.match(html, /diary/);
  assert.match(html, /damaged file was kept/);
});

let failed = 0;
for (const [name, fn] of tests) {
  try { fn(); console.log('pass  ' + name); } catch (e) { failed++; console.log('FAIL  ' + name + '\n      ' + e.message); }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);
