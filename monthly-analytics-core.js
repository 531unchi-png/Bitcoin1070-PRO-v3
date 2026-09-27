// Monthly investment return from complete end-of-day holdings and recorded trades.
((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.B1070MonthlyAnalytics = api;
})(typeof window !== 'undefined' ? window : null, () => {
  'use strict';
  const TYPES = ['crypto', 'jp', 'us', 'fund'];
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const key = row => `${row.type}:${String(row.symbol || '').toUpperCase()}`;
  const valid = row => row?.complete === true && /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
    Number.isFinite(Date.parse(row.updatedAt)) && Array.isArray(row.positions) &&
    row.positions.every(p => TYPES.includes(p.type) && p.symbol && finite(p.quantity) && p.quantity > 0 && finite(p.value) && p.value >= 0) &&
    new Set(row.positions.map(key)).size === row.positions.length;
  function monthly(history, transactions) {
    const ends = new Map();
    for (const row of Array.isArray(history) ? history : []) {
      if (!valid(row)) continue;
      const month = row.date.slice(0, 7);
      if (!ends.has(month) || Date.parse(row.updatedAt) > Date.parse(ends.get(month).updatedAt)) ends.set(month, row);
    }
    const months = [...ends.keys()].sort();
    return months.map((month, index) => {
      const last = ends.get(month), previous = ends.get(months[index - 1]);
      if (!previous || Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) -
          (Number(months[index - 1].slice(0, 4)) * 12 + Number(months[index - 1].slice(5))) !== 1) return null;
      const start = Date.parse(previous.updatedAt), end = Date.parse(last.updatedAt);
      if (end <= start) return null;
      const before = new Map(previous.positions.map(p => [key(p), p]));
      const after = new Map(last.positions.map(p => [key(p), p]));
      const rows = [...new Set([...before.keys(), ...after.keys()])].map(id => {
        const a = before.get(id), b = after.get(id), info = b || a;
        const trades = (Array.isArray(transactions) ? transactions : []).filter(t =>
          (t?.kind === 'BUY' || t?.kind === 'SELL') && key(t) === id &&
          Date.parse(t.date) > start && Date.parse(t.date) <= end);
        let quantityDelta = 0, netInvested = 0, reliable = true;
        for (const t of trades) {
          if (!finite(Number(t.quantity)) || Number(t.quantity) <= 0 || !finite(Number(t.totalJpy)) || Number(t.totalJpy) <= 0) { reliable = false; break; }
          const sign = t.kind === 'BUY' ? 1 : -1;
          quantityDelta += sign * Number(t.quantity);
          netInvested += sign * Number(t.totalJpy);
        }
        const quantityChange = (b?.quantity || 0) - (a?.quantity || 0);
        if (Math.abs(quantityChange - quantityDelta) > 1e-7 * Math.max(1, Math.abs(quantityChange), Math.abs(quantityDelta))) reliable = false;
        return { key: id, type: info.type, symbol: info.symbol, name: info.name,
          opening: a?.value || 0, closing: b?.value || 0, netInvested,
          profit: reliable ? (b?.value || 0) - (a?.value || 0) - netInvested : null };
      });
      const categories = TYPES.map(type => {
        const items = rows.filter(row => row.type === type);
        return { type, opening: items.reduce((v, row) => v + row.opening, 0),
          closing: items.reduce((v, row) => v + row.closing, 0),
          profit: items.some(row => row.profit === null) ? null : items.reduce((v, row) => v + row.profit, 0),
          count: items.length };
      }).filter(row => row.count);
      return { month, startDate: previous.date, endDate: last.date, rows, categories };
    }).filter(Boolean).reverse();
  }
  return { monthly };
});
