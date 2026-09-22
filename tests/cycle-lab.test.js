const assert = require('node:assert/strict');
const test = require('node:test');
const { examine, normalizeCandles, MODEL_DAYS } = require('../cycle-lab-core.js');
const DAY = 86400000;
function weekly(start, end, peaks = {}) {
  const result = [], a = Date.parse(start), b = Date.parse(end);
  for (let ms = a; ms <= b; ms += 7 * DAY) {
    const date = new Date(ms).toISOString().slice(0, 10);
    result.push({ date, close: peaks[date] ?? 100 });
  }
  return result;
}
test('full windows produce only completed periods in error statistic', () => {
  const points = weekly('2014-10-01', '2026-09-16');
  for (const [date, price] of [['2015-01-14', 10], ['2017-12-20', 900],
    ['2018-12-12', 10], ['2021-11-10', 900], ['2022-11-16', 10], ['2025-10-15', 900]]) {
    const row = points.find(x => x.date === date);
    if (row) row.close = price;
  }
  const result = examine(points, { now: Date.parse('2026-09-22'), source: 'yahoo' });
  assert.equal(result.completedCount, 2);
  assert.equal(result.rows[2].complete, false);
  assert.equal(result.meanAbsoluteError, (Math.abs(result.rows[0].deviation) + Math.abs(result.rows[1].deviation)) / 2);
  assert.equal(result.rows[0].predicted, new Date(Date.parse(result.rows[0].bottom.date) + MODEL_DAYS * DAY).toISOString().slice(0, 10));
});
test('missing window edges and long data gaps suppress unsupported results', () => {
  const truncated = weekly('2018-07-01', '2026-09-16');
  const result = examine(truncated, { now: Date.parse('2026-09-22') });
  assert.equal(result.rows[0].valid, false);
  assert.equal(result.rows[1].valid, false);
  const gap = weekly('2014-10-01', '2026-09-16').filter(x => x.date < '2020-06-01' || x.date > '2020-09-01');
  assert.equal(examine(gap, { now: Date.parse('2026-09-22') }).rows[1].valid, false);
});
test('duplicate, invalid and future candles cannot change historical extremes', () => {
  const points = weekly('2014-10-01', '2026-09-16');
  points.push({ date: '2030-01-01', close: 9999999 }, { date: '2015-01-01', close: -2 }, { date: 'nonsense', close: 1 });
  const normalized = normalizeCandles(points, Date.parse('2026-09-22'));
  assert.equal(normalized.some(x => x.close <= 0 || x.day > Date.parse('2026-09-23')), false);
  assert.equal(examine(points, { now: Date.parse('2026-09-22') }).completedCount, 2);
});
