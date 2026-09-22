const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../cycle-lab-core.js');

test('monthly API and monthly cached history are not rendered as a successful audit', async () => {
  const nodes = new Map(), storage = new Map();
  const element = id => { if (!nodes.has(id)) nodes.set(id, { textContent: '', addEventListener() {} }); return nodes.get(id); };
  const monthly = [];
  for (let day = Date.parse('2014-10-01'); day < Date.now(); day += 31 * 86400000)
    monthly.push({ date: new Date(day).toISOString(), close: 100 });
  storage.set('bitcoin1070_cycle_lab_history_v1', JSON.stringify({ candles: monthly, source: 'yahoo', fetchedAt: new Date().toISOString() }));
  let onReady;
  const sandbox = {
    window: { Bitcoin1070CycleLabCore: core },
    document: { getElementById: element, addEventListener: (name, fn) => { if (name === 'DOMContentLoaded') onReady = fn; } },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    fetch: async () => ({ ok: true, json: async () => ({ source: 'yahoo', candles: monthly }) }),
    AbortController, setTimeout, clearTimeout, Date, console
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../cycle-lab.js'), 'utf8'), sandbox);
  onReady();
  await new Promise(resolve => setImmediate(resolve));
  assert.match(element('labStatus').textContent, /週次相当の履歴を取得できませんでした/);
  assert.match(element('labSource').textContent, /週次相当ではありません/);
  assert.equal(element('labCount').textContent, '');
});
