// MUFG NAV is published per 10,000 units. The market API proxies its official feed.
(function (root) {
  'use strict';
  const API = 'https://bitcoin1070-api.531unchi.workers.dev';
  const SUPPORTED = new Set(['0331418A', '03311187']);
  function validDate(date) {
    return /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) &&
      new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date &&
      date <= new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(new Date());
  }
  function normalizeQuotes(data, symbols) {
    const quotes = {};
    symbols.forEach(symbol => {
      const entry = data?.funds?.[symbol];
      const navJpy = Number(entry?.navJpy), navDate = entry?.navDate;
      if (entry?.source === 'mufg' && Number.isFinite(navJpy) &&
          navJpy > 0 && navJpy <= 1000000 && validDate(navDate)) {
        quotes[symbol] = { navJpy, navDate };
      }
    });
    return quotes;
  }
  async function fetchQuotes(symbols, fetchFn = fetch) {
    const list = [...new Set(symbols.map(s => String(s).trim().toUpperCase()))].filter(s => SUPPORTED.has(s));
    if (!list.length) return {};
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetchFn(`${API}?mode=fund-nav&symbols=${encodeURIComponent(list.join(','))}`,
        { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const quotes = normalizeQuotes(await response.json(), list);
      if (!Object.keys(quotes).length) throw new Error('有効な基準価額がありません');
      return quotes;
    } finally {
      clearTimeout(timeout);
    }
  }
  function applyQuotes(assets, quotes) {
    let updated = 0;
    const next = assets.map(asset => {
      const symbol = String(asset.symbol || '').toUpperCase();
      const quote = asset.type === 'fund' ? quotes[symbol] : null;
      if (!quote || !validDate(quote.navDate) ||
          !Number.isFinite(quote.navJpy) || quote.navJpy <= 0 ||
          quote.navDate < asset.navDate ||
          (quote.navDate === asset.navDate && quote.navJpy === asset.navJpy)) return asset;
      updated++;
      return { ...asset, navJpy: quote.navJpy, navDate: quote.navDate };
    });
    return { assets: next, updated };
  }
  root.B1070_FUND_NAV = { fetchQuotes, applyQuotes, normalizeQuotes };
})(typeof window !== 'undefined' ? window : globalThis);
