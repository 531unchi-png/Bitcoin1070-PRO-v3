const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../fund-nav.js'), 'utf8');
const context = { AbortController, setTimeout, clearTimeout, Intl, Date };
vm.runInNewContext(source, context);
const nav = context.B1070_FUND_NAV;

test('updates supported fund NAV without changing holdings, cost or newer manual values', () => {
  const holdings = [
    { type: 'fund', symbol: '0331418A', navJpy: 37000, navDate: '2026-09-20', amount: 10000, cost: 2 },
    { type: 'fund', symbol: '03311187', navJpy: 46000, navDate: '2026-09-26', amount: 5000, cost: 3 },
    { type: 'jp', symbol: '7203', amount: 2, cost: 3000 }
  ];
  const result = nav.applyQuotes(holdings, {
    '0331418A': { navJpy: 38325, navDate: '2026-09-25' },
    '03311187': { navJpy: 45049, navDate: '2026-09-25' }
  });
  assert.equal(result.updated, 1);
  assert.equal(result.assets[0].navJpy, 38325);
  assert.equal(result.assets[0].cost, 2);
  assert.equal(result.assets[0].amount, 10000);
  assert.equal(result.assets[1].navJpy, 46000);
  assert.equal(result.assets[2], holdings[2]);
});

test('rejects malformed prices and dates and never fetches unknown fund codes', async () => {
  let url;
  const data = await nav.fetchQuotes(['0331418A', 'UNKNOWN'], async (endpoint) => {
    url = endpoint;
    return { ok: true, json: async () => ({ funds: {
      '0331418A': { navJpy: 38325, navDate: '2026-09-25', source: 'mufg' },
      UNKNOWN: { navJpy: 99999, navDate: '2026-09-25', source: 'mufg' }
    } }) };
  });
  assert.match(url, /symbols=0331418A/);
  assert.deepEqual(Object.keys(data), ['0331418A']);
  assert.deepEqual(Object.keys(nav.normalizeQuotes({ funds: {
    '0331418A': { navJpy: -1, navDate: '2026-02-30', source: 'mufg' }
  } }, ['0331418A'])), []);
});
