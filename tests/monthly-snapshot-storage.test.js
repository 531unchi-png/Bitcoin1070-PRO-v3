const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('per-asset monthly valuations survive backup validation, legacy records still load', () => {
  const context = { localStorage: {getItem: () => null}, console };
  vm.createContext(context);
  vm.runInContext(`${fs.readFileSync('storage.js', 'utf8')}\nthis.sanitize = sanitizeAssetSnapshots;`, context);
  const row = { date: '2026-09-27', updatedAt: '2026-09-27T10:00:00Z', complete: true,
    total: 1000, crypto: 0, jp: 1000, us: 0, fund: 0, cash: 0,
    positions: [{type: 'jp', symbol: '285A', name: 'キオクシア', quantity: 2, value: 1000}] };
  assert.equal(context.sanitize([row])[0].positions[0].value, 1000);
  assert.equal(context.sanitize([{...row, positions: undefined}])[0].positions, undefined);
  assert.throws(() => context.sanitize([{...row, positions: [{...row.positions[0], value: -10}]}]));
  assert.throws(() => context.sanitize([{...row, positions: [row.positions[0], row.positions[0]]}]));
});
