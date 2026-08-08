// Bitcoin1070 PRO v11.9 - market convenience tools
(() => {
  'use strict';
  const KEY = 'bitcoin1070_market_tools_v11_9';
  const $ = id => document.getElementById(id);
  const yen = v => `¥${Math.round(Number(v)||0).toLocaleString('ja-JP')}`;
  const pct = v => `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(1)}%`;
  let latestPrice = 0;

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; }
  }
  function save() {
    const data = {
      buyTarget: Number($('btcBuyTarget')?.value || 0),
      sellTarget: Number($('btcSellTarget')?.value || 0),
      memo: String($('marketMemo')?.value || '')
    };
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) {}
    renderTargets();
  }
  function loadSaved() {
    const d = read();
    if ($('btcBuyTarget') && d.buyTarget) $('btcBuyTarget').value = d.buyTarget;
    if ($('btcSellTarget') && d.sellTarget) $('btcSellTarget').value = d.sellTarget;
    if ($('marketMemo')) $('marketMemo').value = d.memo || '';
  }
  function renderTargets() {
    const buy = Number($('btcBuyTarget')?.value || 0);
    const sell = Number($('btcSellTarget')?.value || 0);
    const buyEl = $('btcBuyDistance');
    const sellEl = $('btcSellDistance');
    if (buyEl) {
      if (latestPrice > 0 && buy > 0) {
        const diff = (buy / latestPrice - 1) * 100;
        buyEl.innerHTML = `現在 ${yen(latestPrice)} → 買い目標 ${yen(buy)} <strong>${pct(diff)}</strong>`;
      } else buyEl.textContent = 'BTC価格取得後に距離を表示します';
    }
    if (sellEl) {
      if (latestPrice > 0 && sell > 0) {
        const diff = (sell / latestPrice - 1) * 100;
        sellEl.innerHTML = `現在 ${yen(latestPrice)} → 利確目標 ${yen(sell)} <strong>${pct(diff)}</strong>`;
      } else sellEl.textContent = 'BTC価格取得後に距離を表示します';
    }
  }
  function parseCurrentPrice() {
    const text = $('btcPrice')?.textContent || '';
    const n = Number(text.replace(/[^0-9]/g,''));
    if (n > 0) latestPrice = n;
    renderTargets();
  }
  function updateStatus(detail) {
    if (Number(detail?.btc?.price) > 0) latestPrice = Number(detail.btc.price);
    renderTargets();
    const status = $('marketConnectionStatus');
    if (!status) return;
    if (latestPrice > 0) {
      status.textContent = '● 市場データ取得済み';
      status.className = 'market-connection-status ok';
    } else {
      status.textContent = '● 市場データ未取得';
      status.className = 'market-connection-status warn';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadSaved();
    ['btcBuyTarget','btcSellTarget'].forEach(id => $(id)?.addEventListener('input', save));
    $('marketMemo')?.addEventListener('input', save);
    $('clearMarketMemo')?.addEventListener('click', () => { if ($('marketMemo')) $('marketMemo').value=''; save(); });
    parseCurrentPrice();
    setTimeout(parseCurrentPrice, 2500);
  });
  window.addEventListener('b1070:market-updated', e => updateStatus(e.detail));
})();
