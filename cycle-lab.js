// Dedicated view: no edits to holdings, forecasts or existing 1070-day model.
(() => {
  'use strict';
  const API = 'https://bitcoin1070-api.531unchi.workers.dev?mode=btc-cycle';
  const CACHE = 'bitcoin1070_cycle_lab_history_v1';
  const $ = id => document.getElementById(id);
  const fmtDate = date => date ? date.replace(/-/g, '/') : '—';
  const fmtYen = price => `¥${Math.round(price).toLocaleString('ja-JP')}`;
  const text = (id, value) => { const el = $(id); if (el) el.textContent = value; };
  function validHistory(payload) {
    const report = window.Bitcoin1070CycleLabCore.examine(payload?.candles, { source: payload?.source });
    return report.count >= 400 && report.resolution !== null && report.resolution <= 10 && !report.stale;
  }

  async function history() {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(API, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!['yahoo', 'coingecko'].includes(data?.source) || !validHistory(data))
        throw Error('取得履歴が週次相当ではありません。APIの更新または再取得をお待ちください');
      const payload = { candles: data.candles, source: data.source, fetchedAt: new Date().toISOString() };
      try { localStorage.setItem(CACHE, JSON.stringify(payload)); } catch (_) {}
      return { ...payload, cached: false };
    } catch (error) {
      let cached;
      try { cached = JSON.parse(localStorage.getItem(CACHE) || 'null'); } catch (_) {}
      if (validHistory(cached))
        return { ...cached, cached: true, error: String(error?.message || error) };
      throw error;
    } finally { clearTimeout(timer); }
  }

  function rowCell(value, className) {
    const td = document.createElement('td');
    td.textContent = value;
    if (className) td.className = className;
    return td;
  }
  function render(report, payload) {
    const source = report.source === 'yahoo' ? 'Yahoo Finance BTC/JPY 週足・終値'
      : 'CoinGecko BTC/JPY 約7日間隔の価格';
    text('labStatus', report.completedCount === 0 ? '比較できる完了サイクルがありません。履歴の開始・終了期間を確認してください。' :
      payload.cached ? '保存データで表示中。最新履歴は取得できませんでした。' : '取得した履歴から再計算しました。');
    text('labSource', `${source}｜${report.count}点｜${fmtDate(report.first)}〜${fmtDate(report.last)}｜中央値 ${report.resolution ?? '—'}日間隔`);
    text('labUpdated', `取得: ${new Date(payload.fetchedAt).toLocaleString('ja-JP')}${report.stale ? '｜最終価格が21日超前のため最新サイクルは参考' : ''}`);
    text('labCount', `${report.completedCount}件`);
    text('labError', report.meanAbsoluteError === null ? '算出不可' : `${Math.round(report.meanAbsoluteError)}日`);
    text('labHits', `${report.hits90} / ${report.completedCount}件`);
    const body = $('labRows');
    body.replaceChildren();
    for (const row of report.rows) {
      const tr = document.createElement('tr');
      if (!row.valid) {
        tr.append(rowCell(row.label), rowCell(row.reason, 'lab-muted'));
        const rest = rowCell('計算対象外'); rest.colSpan = 4; tr.append(rest);
      } else {
        tr.append(rowCell(row.label + (row.complete ? '（確定期間）' : '（進行中）')),
          rowCell(`${fmtDate(row.bottom.date)}\n${fmtYen(row.bottom.close)}`),
          rowCell(`${fmtDate(row.peak.date)}\n${fmtYen(row.peak.close)}`),
          rowCell(fmtDate(row.predicted)),
          rowCell(`${row.days}日`),
          rowCell(`${row.deviation > 0 ? '+' : ''}${row.deviation}日${row.complete ? '' : '（暫定）'}`));
      }
      body.append(tr);
    }
    const provisional = report.rows.find(r => !r.complete);
    text('labProvisional', provisional?.valid
      ? `2022年の底から、現時点までの観測高値は ${fmtDate(provisional.peak.date)}。その後に高値を更新すれば日数も変わります。`
      : '最新サイクルは履歴不足のため算出できません。');
  }
  async function load() {
    text('labStatus', 'BTC/JPYの履歴を確認中...');
    try {
      const payload = await history();
      const report = window.Bitcoin1070CycleLabCore.examine(payload.candles, { source: payload.source });
      render(report, payload);
    } catch (error) {
      text('labStatus', '検証に必要な週次相当の履歴を取得できませんでした。再取得しても続く場合はAPI側の確認が必要です。');
      text('labSource', String(error?.message || error));
    }
  }
  document.addEventListener('DOMContentLoaded', () => { $('labReload')?.addEventListener('click', load); load(); });
})();
