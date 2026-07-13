(() => {
  'use strict';

  const FAVORITES_KEY = 'bitcoin1070_v7_info_favorites';
  const ASSETS_KEY = 'bitcoin1070_v3_assets';

  const SOURCES = [
    { id:'jp-market', icon:'🇯🇵', title:'日本株ニュース', subtitle:'市況・決算・材料', importance:4, category:'jp', url:'https://finance.yahoo.co.jp/', keywords:['日本株'] },
    { id:'us-market', icon:'🇺🇸', title:'米国株ニュース', subtitle:'NASDAQ・AI・決算', importance:4, category:'us', url:'https://finance.yahoo.com/', keywords:['米国株'] },
    { id:'crypto-market', icon:'₿', title:'暗号資産ニュース', subtitle:'BTC・アルトコイン・規制', importance:5, category:'crypto', url:'https://www.coindeskjapan.com/', keywords:['BTC'] },
    { id:'macro', icon:'🌐', title:'経済指標カレンダー', subtitle:'FOMC・CPI・雇用統計', importance:5, category:'calendar', url:'https://jp.investing.com/economic-calendar/', keywords:['経済指標'] },
    { id:'us-earnings', icon:'📊', title:'米国株決算カレンダー', subtitle:'主要企業の決算予定', importance:4, category:'calendar', url:'https://www.tradingview.com/markets/stocks-usa/earnings/', keywords:['米国決算'] },
    { id:'jp-earnings', icon:'🧾', title:'日本株決算カレンダー', subtitle:'国内企業の決算予定', importance:4, category:'calendar', url:'https://finance.yahoo.co.jp/stocks/earnings/', keywords:['日本株決算'] },
    { id:'crypto-events', icon:'🪙', title:'暗号資産イベント', subtitle:'アップデート・解除・上場', importance:3, category:'calendar', url:'https://coinmarketcal.com/', keywords:['暗号資産イベント'] }
  ];

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }

  function getAssets() {
    const assets = loadJSON(ASSETS_KEY, []);
    return Array.isArray(assets) ? assets : [];
  }

  function getFavorites() {
    const favorites = loadJSON(FAVORITES_KEY, []);
    return Array.isArray(favorites) ? favorites : [];
  }

  function saveFavorites(items) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
  }

  function stars(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }

  function assetSearchUrl(asset) {
    const term = encodeURIComponent(`${asset.name || asset.symbol || ''} ${asset.symbol || ''} ニュース`);
    if (asset.type === 'crypto') return `https://www.google.com/search?q=${term}`;
    if (asset.type === 'jp') return `https://finance.yahoo.co.jp/search/?query=${term}`;
    return `https://finance.yahoo.com/lookup?s=${encodeURIComponent(asset.symbol || '')}`;
  }

  function renderPersonalized() {
    const container = document.getElementById('personalizedSources');
    const empty = document.getElementById('personalizedEmpty');
    if (!container) return;
    const assets = getAssets();
    if (!assets.length) {
      empty?.classList.remove('hidden');
      container.innerHTML = '';
      return;
    }
    empty?.classList.add('hidden');
    const unique = [];
    const seen = new Set();
    for (const asset of assets) {
      const key = `${asset.type}:${asset.symbol}`;
      if (!asset.symbol || seen.has(key)) continue;
      seen.add(key); unique.push(asset);
    }
    container.innerHTML = unique.slice(0, 10).map(asset => `
      <a class="personal-source" href="${assetSearchUrl(asset)}" target="_blank" rel="noopener">
        <span>${asset.type === 'crypto' ? '🪙' : asset.type === 'jp' ? '🇯🇵' : '🇺🇸'}</span>
        <div><strong>${escapeHTML(asset.name || asset.symbol)}</strong><small>${escapeHTML(asset.symbol)}の関連情報を確認</small></div><b>›</b>
      </a>`).join('');
  }

  function renderSources(filter='all') {
    const container = document.getElementById('sourceCards');
    if (!container) return;
    const favorites = getFavorites();
    const list = SOURCES.filter(item => filter === 'all' || item.category === filter || (filter === 'favorite' && favorites.includes(item.id)));
    container.innerHTML = list.map(item => `
      <article class="info-source-card" data-category="${item.category}">
        <div class="info-source-top"><span class="info-source-icon">${item.icon}</span><button class="favorite-toggle" data-id="${item.id}" aria-label="お気に入り">${favorites.includes(item.id) ? '★' : '☆'}</button></div>
        <h3>${item.title}</h3><p>${item.subtitle}</p>
        <div class="importance-row"><span>重要度</span><strong>${stars(item.importance)}</strong></div>
        <a href="${item.url}" target="_blank" rel="noopener">最新情報を開く ›</a>
      </article>`).join('') || '<div class="empty-info">お気に入りはまだありません。</div>';

    container.querySelectorAll('.favorite-toggle').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.dataset.id;
        const current = getFavorites();
        const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
        saveFavorites(next);
        renderSources(document.querySelector('.filter-chip.active')?.dataset.filter || 'all');
      });
    });
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderPersonalized();
    renderSources();
    document.querySelectorAll('.filter-chip').forEach(chip => chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(x => x.classList.remove('active'));
      chip.classList.add('active');
      renderSources(chip.dataset.filter);
    }));
  });
})();
