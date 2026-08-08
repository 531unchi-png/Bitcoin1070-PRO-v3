// Bitcoin1070 PRO v11.9 - shared market loader
(() => {
  'use strict';

  const API = 'https://bitcoin1070-api.531unchi.workers.dev';
  const CACHE_KEY = 'bitcoin1070_home_market_v11_9';
  const $ = id => document.getElementById(id);
  const yen = value => `¥${Math.round(Number(value) || 0).toLocaleString('ja-JP')}`;
  const pct = value => `${Number(value) > 0 ? '+' : ''}${Number(value || 0).toFixed(2)}%`;

  async function fetchJson(url, timeoutMs = 6000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (_) { return null; }
  }

  function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, savedAt: new Date().toISOString() })); } catch (_) {}
  }

  function renderBTC(price, change, cached = false) {
    const priceEl = $('btcPrice');
    const changeEl = $('btcChange');
    if (priceEl) priceEl.textContent = `${yen(price)}${cached ? ' *' : ''}`;
    if (changeEl) {
      changeEl.textContent = pct(change);
      changeEl.classList.remove('profit-positive', 'profit-negative', 'profit-neutral');
      changeEl.classList.add(change > 0 ? 'profit-positive' : change < 0 ? 'profit-negative' : 'profit-neutral');
    }
  }

  function renderFear(value, label, cached = false) {
    const el = $('fear');
    if (el) el.innerHTML = `${Math.round(value)}${cached ? '*' : ''}<div class="small">${label || '指数'}</div>`;
  }

  function renderComment({ change, fear, failed = false }) {
    const el = $('aiComment');
    if (!el) return;
    if (failed) {
      el.innerHTML = '<p>市場データを取得できませんでした。「価格を更新」を押すか、通信状態を確認してください。</p>';
      return;
    }
    const comments = [];
    if (Number.isFinite(change)) {
      if (change >= 5) comments.push('BTCは24時間で大きく上昇しています。短期的な過熱に注意してください。');
      else if (change <= -5) comments.push('BTCは24時間で大きく下落しています。底を急いで断定せず、分割で判断してください。');
      else if (change > 0) comments.push('BTCは24時間ベースで上昇しています。');
      else if (change < 0) comments.push('BTCは24時間ベースで下落しています。');
      else comments.push('BTCは24時間ベースでほぼ横ばいです。');
    }
    if (Number.isFinite(fear)) {
      if (fear <= 25) comments.push('市場心理は強い恐怖圏です。長期では仕込み候補ですが、下落継続も想定してください。');
      else if (fear >= 75) comments.push('市場心理は強欲圏です。上昇中でも利確と急落への備えが必要です。');
      else comments.push('市場心理は極端ではありません。価格と1070日サイクルを合わせて確認してください。');
    }
    el.innerHTML = comments.length ? comments.map(x => `<p>${x}</p>`).join('') : '<p>市場データを確認中です。</p>';
  }

  async function getBTC() {
    const attempts = [
      async () => {
        const data = await fetchJson(`${API}?mode=crypto&ids=bitcoin&t=${Date.now()}`);
        return { price: Number(data?.prices?.bitcoin?.jpy), change: Number(data?.prices?.bitcoin?.jpy_24h_change) || 0 };
      },
      async () => {
        const data = await fetchJson('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=jpy&include_24hr_change=true');
        return { price: Number(data?.bitcoin?.jpy), change: Number(data?.bitcoin?.jpy_24h_change) || 0 };
      }
    ];
    for (const attempt of attempts) {
      try {
        const result = await attempt();
        if (result.price > 0) return result;
      } catch (_) {}
    }
    throw new Error('BTC unavailable');
  }

  async function getFear() {
    const attempts = [
      async () => {
        const data = await fetchJson(`${API}?mode=fear-greed&t=${Date.now()}`);
        const value = Number(data?.value ?? data?.data?.[0]?.value);
        const label = String(data?.classification ?? data?.data?.[0]?.value_classification ?? '');
        return { value, label };
      },
      async () => {
        const data = await fetchJson('https://api.alternative.me/fng/?limit=1');
        return { value: Number(data?.data?.[0]?.value), label: String(data?.data?.[0]?.value_classification || '') };
      }
    ];
    for (const attempt of attempts) {
      try {
        const result = await attempt();
        if (Number.isFinite(result.value)) return result;
      } catch (_) {}
    }
    throw new Error('Fear unavailable');
  }

  function renderUpdatedAt(cached = false) {
    const el = $('marketUpdatedAt');
    if (!el) return;
    const now = new Date();
    el.textContent = `${cached ? '保存値 ' : ''}${now.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})} 更新`;
  }

  async function load() {
    const priceEl = $('btcPrice');
    const fearEl = $('fear');
    const aiEl = $('aiComment');
    if (!priceEl && !fearEl && !aiEl) return;

    const cache = readCache();
    if (cache?.btc?.price > 0) renderBTC(cache.btc.price, cache.btc.change || 0, true);
    if (Number.isFinite(Number(cache?.fear?.value))) renderFear(Number(cache.fear.value), cache.fear.label || '保存値', true);
    if (cache?.btc?.price > 0 || Number.isFinite(Number(cache?.fear?.value))) renderUpdatedAt(true);

    const hardStop = setTimeout(() => {
      if (priceEl && /取得中/.test(priceEl.textContent || '')) priceEl.textContent = '取得失敗';
      if (fearEl && /取得中/.test(fearEl.textContent || '')) fearEl.innerHTML = '取得失敗<div class="small">再読み込みしてください</div>';
      if (aiEl && /分析中/.test(aiEl.textContent || '')) renderComment({ failed: true });
    }, 9000);

    const [btcResult, fearResult] = await Promise.allSettled([getBTC(), getFear()]);
    clearTimeout(hardStop);

    const btc = btcResult.status === 'fulfilled' ? btcResult.value : null;
    const fear = fearResult.status === 'fulfilled' ? fearResult.value : null;

    if (btc) renderBTC(btc.price, btc.change, false);
    else if (!(cache?.btc?.price > 0) && priceEl) {
      priceEl.textContent = '取得失敗';
      const changeEl = $('btcChange'); if (changeEl) changeEl.textContent = '更新してください';
    }

    if (fear) renderFear(fear.value, fear.label, false);
    else if (!Number.isFinite(Number(cache?.fear?.value)) && fearEl) fearEl.innerHTML = '取得失敗<div class="small">更新してください</div>';

    const effectiveBTC = btc || cache?.btc || null;
    const effectiveFear = fear || cache?.fear || null;
    renderComment({
      change: effectiveBTC ? Number(effectiveBTC.change) : null,
      fear: effectiveFear ? Number(effectiveFear.value) : null,
      failed: !effectiveBTC && !effectiveFear
    });

    if (btc || fear) {
      writeCache({ btc: btc || cache?.btc || null, fear: fear || cache?.fear || null });
      renderUpdatedAt(false);
    } else if (cache) {
      renderUpdatedAt(true);
    }

    window.dispatchEvent(new CustomEvent('b1070:market-updated', { detail: { btc: effectiveBTC, fear: effectiveFear } }));
  }

  window.Bitcoin1070HomeMarket = { load };
  document.addEventListener('click', event => {
    if (event.target?.id === 'homeRefreshAsset' || event.target?.closest?.('#homeRefreshAsset') || event.target?.id === 'marketRefreshButton' || event.target?.closest?.('#marketRefreshButton')) {
      setTimeout(load, 200);
    }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, { once: true });
  else load();
})();
