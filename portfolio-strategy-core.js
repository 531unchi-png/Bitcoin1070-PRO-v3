// Portfolio performance and allocation calculations. No trading or price fetching.
((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.B1070PortfolioStrategy = api;
})(typeof window !== 'undefined' ? window : null, () => {
  'use strict';
  const DAY = 86400000;
  const LIMITS = Object.freeze({ single: 30, crypto: 40, semi: 35, alt: 50, cashMin: 5, semiSymbols: 'NVDA,6857' });
  const number = v => v === '' || v === null || v === undefined ? null : Number.isFinite(Number(v)) ? Number(v) : null;
  const key = a => `${a.type}:${String(a.symbol || '').trim().toUpperCase()}`;
  function performance(history, transactions) {
    const points = (Array.isArray(history) ? history : []).filter(p =>
      p?.complete === true && /^\d{4}-\d{2}-\d{2}$/.test(p?.date || '') && Number.isFinite(Date.parse(p.updatedAt)) &&
      number(p.total) !== null && number(p.total) >= 0 &&
      Date.parse(p.updatedAt) >= Date.parse(`${p.date}T00:00:00Z`) - DAY &&
      Date.parse(p.updatedAt) < Date.parse(`${p.date}T00:00:00Z`) + 2 * DAY
    ).sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt));
    if (points.length < 2) return { ready: false, reason: '日時付きの評価記録が2日分必要です。' };
    const first = points[0], last = points[points.length - 1];
    const start = Date.parse(first.updatedAt), end = Date.parse(last.updatedAt);
    if (end - start < DAY / 2 || first.date === last.date) return { ready: false, reason: '異なる日付の評価記録が必要です。' };
    const opening = number(first.total), closing = number(last.total);
    if (opening <= 0) return { ready: false, reason: '開始時点の評価額が0円です。' };
    let netFlow = 0, weightedFlow = 0, flowCount = 0;
    for (const item of Array.isArray(transactions) ? transactions : []) {
      if (!['DEPOSIT', 'WITHDRAWAL'].includes(item?.kind)) continue;
      const at = Date.parse(item.date), amount = number(item.totalJpy);
      if (!Number.isFinite(at) || amount === null || amount < 0) return { ready: false, reason: '入出金の日時・金額を確認してください。' };
      if (at <= start || at > end) continue;
      const flow = item.kind === 'DEPOSIT' ? amount : -amount;
      netFlow += flow;
      weightedFlow += flow * (end - at) / (end - start);
      flowCount++;
    }
    const profit = closing - opening - netFlow;
    const capital = opening + weightedFlow;
    return { ready: true, start: first.date, end: last.date, opening, closing, netFlow,
      flowCount, profit, rate: capital > 0 ? 100 * profit / capital : null,
      method: '修正ディーツ法（入出金日時による概算）' };
  }
  function limitsOf(raw) {
    const next = { ...LIMITS };
    for (const name of ['single', 'crypto', 'semi', 'alt', 'cashMin']) {
      const n = number(raw?.[name]);
      if (n !== null && n >= 0 && n <= 100) next[name] = n;
    }
    if (typeof raw?.semiSymbols === 'string' && raw.semiSymbols.length <= 500)
      next.semiSymbols = raw.semiSymbols.toUpperCase().split(/[,、\s]+/).filter(x => /^[A-Z0-9.\-]{1,20}$/.test(x)).slice(0, 30).join(',');
    return next;
  }
  function allocation(rows, cash, rawLimits) {
    const limits = limitsOf(rawLimits);
    const holdings = (Array.isArray(rows) ? rows : []).filter(r => number(r?.amount) > 0);
    const missing = holdings.filter(r => number(r.marketValueJpy) === null || number(r.currentPriceJpy) <= 0);
    if (missing.length) return { ready: false, missing: missing.map(r => r.symbol) };
    const money = number(cash);
    if (money === null || money < 0) return { ready: false, missing: ['日本円残高'] };
    const values = holdings.map(r => ({ type: r.type, symbol: String(r.symbol).toUpperCase(),
      name: r.name, value: number(r.marketValueJpy) }));
    if (values.some(r => r.value === null || r.value < 0)) return { ready: false, missing: ['評価額'] };
    const total = values.reduce((s, r) => s + r.value, money);
    if (total <= 0) return { ready: false, missing: ['資産評価額'] };
    const category = { crypto: 0, jp: 0, us: 0, fund: 0, cash: money };
    for (const row of values) category[row.type] = (category[row.type] || 0) + row.value;
    const btc = values.filter(r => r.type === 'crypto' && r.symbol === 'BTC').reduce((s, r) => s + r.value, 0);
    const semiSet = new Set(limits.semiSymbols.split(',').filter(Boolean));
    const semi = values.filter(r => semiSet.has(r.symbol)).reduce((s, r) => s + r.value, 0);
    const largest = values.reduce((best, r) => r.value > (best?.value || 0) ? r : best, null);
    const metrics = [
      { id: 'single', label: `最大銘柄 ${largest?.symbol || '—'}`, ratio: largest ? largest.value / total * 100 : 0, limit: limits.single },
      { id: 'crypto', label: '暗号資産／総資産', ratio: category.crypto / total * 100, limit: limits.crypto },
      { id: 'semi', label: '指定した半導体関連／総資産', ratio: semi / total * 100, limit: limits.semi },
      { id: 'alt', label: 'アルト／暗号資産', ratio: category.crypto > 0 ? (category.crypto - btc) / category.crypto * 100 : 0, limit: limits.alt },
      { id: 'cashMin', label: '現金／総資産', ratio: money / total * 100, limit: limits.cashMin }
    ];
    for (const m of metrics) m.breached = m.id === 'cashMin' ? m.ratio < m.limit : m.ratio > m.limit;
    return { ready: true, values, cash: money, total, category, metrics, limits };
  }
  function simulate(snapshot, assetKey, amount) {
    if (!snapshot?.ready) return { ready: false, reason: '全保有銘柄の価格取得後に試算できます。' };
    const budget = number(amount);
    if (budget === null || budget <= 0 || budget > snapshot.cash) return { ready: false, reason: '投入額は0円超、現金残高以下で入力してください。' };
    const selected = snapshot.values.find(r => key(r) === assetKey);
    if (!selected) return { ready: false, reason: '保有銘柄を選んでください。' };
    const next = snapshot.values.map(r => ({ ...r, value: r.value + (key(r) === assetKey ? budget : 0), amount: 1, marketValueJpy: r.value + (key(r) === assetKey ? budget : 0), currentPriceJpy: 1 }));
    const after = allocation(next, snapshot.cash - budget, snapshot.limits);
    return { ready: true, before: snapshot, after, selected, budget };
  }
  return { LIMITS, performance, limitsOf, allocation, simulate, key };
});
