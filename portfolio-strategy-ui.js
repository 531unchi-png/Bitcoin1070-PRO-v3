// Portfolio decision panel. Quotes and daily snapshots come from the existing portfolio flow.
(() => {
  'use strict';
  const core = window.B1070PortfolioStrategy;
  const $ = id => document.getElementById(id);
  const fmt = n => `¥${Math.round(n).toLocaleString('ja-JP')}`;
  const signed = n => `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n))}`;
  const percent = n => `${n.toFixed(1)}%`;
  const limitsKey = () => typeof activeStorageKey === 'function' ? activeStorageKey(STRATEGY_LIMITS_KEY) : 'bitcoin1070_strategy_limits_v1';
  let current = null;
  function savedLimits() {
    try { return core.limitsOf(JSON.parse(localStorage.getItem(limitsKey()) || 'null')); }
    catch (_) { return core.limitsOf(null); }
  }
  function setText(id, value) { if ($(id)) $(id).textContent = value; }
  function message(id, value) { const el = $(id); if (el) el.textContent = value; }
  function renderPerformance() {
    const result = core.performance(loadAssetHistory(), loadTransactionsFromStorage());
    if (!result.ready) {
      ['strategyProfit', 'strategyRate', 'strategyNetFlow'].forEach(id => setText(id, '—'));
      message('strategyPerformanceNote', `${result.reason} 旧履歴は評価の完全性を確認できないため、更新後の記録から集計します。`);
      return;
    }
    setText('strategyProfit', signed(result.profit));
    setText('strategyRate', result.rate === null ? '算出不可' : `${result.rate >= 0 ? '+' : ''}${result.rate.toFixed(2)}%`);
    setText('strategyNetFlow', signed(result.netFlow));
    message('strategyPerformanceNote', `${result.start}〜${result.end}／開始 ${fmt(result.opening)} → 終了 ${fmt(result.closing)}。記録済み入出金 ${result.flowCount}件を控除。騰落率は${result.method}。台帳外の入出金・手入力変更がある期間は正確に算出できません。`);
  }
  function metricRow(metric, previous) {
    const row = document.createElement('div'); row.className = `strategy-metric ${metric.breached ? 'strategy-breach' : ''}`;
    const label = document.createElement('span'); label.textContent = metric.label;
    const value = document.createElement('strong');
    const change = previous === undefined ? '' : `${percent(previous)} → `;
    value.textContent = `${change}${percent(metric.ratio)} ／ ${metric.id === 'cashMin' ? '下限' : '上限'} ${percent(metric.limit)}${metric.breached ? ' ⚠️' : ''}`;
    row.append(label, value); return row;
  }
  function renderAllocation(evaluations) {
    const staleFunds = evaluations.filter(a => a.type === 'fund' && Number(a.amount) > 0 &&
      (!Number.isFinite(Date.parse(`${a.navDate}T00:00:00Z`)) || Date.now() - Date.parse(`${a.navDate}T00:00:00Z`) > 8 * 86400000));
    if (staleFunds.length) {
      current = { ready: false, missing: staleFunds.map(a => a.symbol) };
      $('strategyAllocationRows').replaceChildren(); $('strategySimulationResult').replaceChildren();
      message('strategyAllocationNote', `投資信託 ${staleFunds.map(a => a.symbol).join('、')} の基準価額が古いため配分と試算を停止しています。資産編集で更新してください。`);
      return;
    }
    const cryptoAssets = evaluations.filter(a => a.type === 'crypto' && Number(a.amount) > 0);
    const cryptoTime = typeof latestCryptoPricesUpdatedAt !== 'undefined' ? Date.parse(latestCryptoPricesUpdatedAt) : NaN;
    const allFresh = typeof latestCryptoFreshSymbols !== 'undefined' && cryptoAssets.every(a =>
      latestCryptoFreshSymbols.has(String(a.symbol || '').trim().toUpperCase()));
    if (cryptoAssets.length && (!allFresh || !Number.isFinite(cryptoTime) || cryptoTime > Date.now() || Date.now() - cryptoTime >= 24 * 60 * 60 * 1000)) {
      current = { ready: false, missing: ['仮想通貨の更新済み価格'] };
      $('strategyAllocationRows').replaceChildren();
      $('strategySimulationResult').replaceChildren();
      message('strategyAllocationNote', '一部の仮想通貨価格を今回取得できないため判定を停止しています。価格更新を待ってください。');
      return;
    }
    current = core.allocation(evaluations, loadCashBalance(), savedLimits());
    const box = $('strategyAllocationRows');
    if (!current.ready) {
      box.replaceChildren();
      message('strategyAllocationNote', `価格未取得: ${current.missing.join('、')}。不足を0円扱いせず、配分判定を停止しています。`);
      $('strategySimulationResult').replaceChildren();
      return;
    }
    box.replaceChildren(...current.metrics.map(m => metricRow(m)));
    message('strategyAllocationNote', `評価総額 ${fmt(current.total)}。半導体関連は設定欄の銘柄だけを集計。警告はアプリ表示時と価格更新時に判定します。`);
    const select = $('strategyAsset'); const chosen = select.value;
    select.replaceChildren();
    const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = '保有銘柄を選択'; select.append(placeholder);
    current.values.forEach(row => { const option = document.createElement('option'); option.value = core.key(row); option.textContent = `${row.symbol}（${row.name || row.type}）`; select.append(option); });
    select.value = current.values.some(row => core.key(row) === chosen) ? chosen : '';
    renderSimulation();
  }
  function renderSimulation() {
    const box = $('strategySimulationResult'); if (!box) return;
    box.replaceChildren();
    if (!current?.ready) { box.textContent = '全銘柄の価格取得後に試算できます。'; return; }
    const choice = $('strategyAsset').value, raw = $('strategyBudget').value;
    if (!choice || !raw) { box.textContent = `現金残高 ${fmt(current.cash)}から投入額と保有銘柄を選んでください。`; return; }
    const result = core.simulate(current, choice, raw);
    if (!result.ready) { box.textContent = result.reason; return; }
    const summary = document.createElement('p'); summary.textContent = `${result.selected.symbol}に ${fmt(result.budget)} 投入した場合。総資産 ${fmt(result.after.total)}（変化なし）、残る現金 ${fmt(result.after.cash)}。手数料・値動き・税は含みません。`;
    box.append(summary, ...result.after.metrics.map((m, i) => metricRow(m, result.before.metrics[i].ratio)));
  }
  function render(evaluations) {
    if (!$('strategyPerformance')) return;
    renderPerformance();
    renderAllocation(evaluations);
  }
  document.addEventListener('DOMContentLoaded', () => {
    const limits = savedLimits(), form = $('strategyLimitsForm');
    for (const field of ['single', 'crypto', 'semi', 'alt', 'cashMin', 'semiSymbols']) form.elements[field].value = limits[field];
    form.addEventListener('submit', event => {
      event.preventDefault();
      const raw = Object.fromEntries(new FormData(form));
      for (const field of ['single', 'crypto', 'semi', 'alt', 'cashMin']) {
        if (raw[field] === '' || !Number.isFinite(Number(raw[field])) || Number(raw[field]) < 0 || Number(raw[field]) > 100) {
          message('strategySaveStatus', '上限・下限は0〜100%で入力してください。'); return;
        }
      }
      const clean = core.limitsOf(raw);
      try {
        localStorage.setItem(limitsKey(), JSON.stringify(clean));
        message('strategySaveStatus', '配分設定を保存しました。');
        render(evaluateAssets());
      } catch (_) { message('strategySaveStatus', '保存できませんでした。端末の空き容量を確認してください。'); }
    });
    $('strategyAsset').addEventListener('change', renderSimulation);
    $('strategyBudget').addEventListener('input', renderSimulation);
    // Initial price refresh calls render again; this also displays the loading/empty state promptly.
    render(evaluateAssets());
  });
  window.updatePortfolioStrategy = render;
})();
