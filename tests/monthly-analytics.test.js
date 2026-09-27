const test = require('node:test');
const assert = require('node:assert/strict');
const { monthly } = require('../monthly-analytics-core.js');
const snapshot = (date, positions, complete = true) => ({ date: date.slice(0, 10), updatedAt: date, positions, complete });
const position = (type, symbol, quantity, value) => ({ type, symbol, name: symbol, quantity, value });

test('monthly gains subtract buys and add sale proceeds without counting transfers as profit', () => {
  const data = monthly([
    snapshot('2026-08-31T12:00:00Z', [position('fund', 'WORLD', 10, 1000), position('jp', 'A', 2, 200)]),
    snapshot('2026-09-29T12:00:00Z', [position('fund', 'WORLD', 12, 1440), position('jp', 'A', 1, 125)])
  ], [
    { kind: 'BUY', type: 'fund', symbol: 'WORLD', quantity: 2, totalJpy: 240, date: '2026-09-10T12:00:00Z' },
    { kind: 'SELL', type: 'jp', symbol: 'A', quantity: 1, totalJpy: 105, date: '2026-09-15T12:00:00Z' },
    { kind: 'DEPOSIT', totalJpy: 100000, date: '2026-09-15T12:00:00Z' }
  ]);
  assert.equal(data[0].month, '2026-09');
  assert.equal(data[0].rows.find(r => r.symbol === 'WORLD').profit, 200);
  assert.equal(data[0].rows.find(r => r.symbol === 'A').profit, 30);
  assert.equal(data[0].categories.find(r => r.type === 'fund').profit, 200);
});

test('unknown holding changes and unavailable valuations cannot be presented as profit', () => {
  const valid = snapshot('2026-08-31T12:00:00Z', [position('crypto', 'BTC', 1, 100)]);
  const edited = snapshot('2026-09-25T12:00:00Z', [position('crypto', 'BTC', 2, 250)]);
  const data = monthly([valid, edited], []);
  assert.equal(data[0].rows[0].profit, null);
  assert.equal(data[0].categories[0].profit, null);
  assert.equal(monthly([valid, { ...edited, complete: false }], []).length, 0);
  assert.equal(monthly([snapshot('2026-07-31T12:00:00Z', valid.positions), edited], []).length, 0);
  assert.equal(monthly([{...valid, positions: undefined}, edited], []).length, 0);
});
