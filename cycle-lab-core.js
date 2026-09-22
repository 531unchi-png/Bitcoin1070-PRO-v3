// 1070-day hypothesis audit. Historical segmentation is descriptive, not a trading signal.
((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.Bitcoin1070CycleLabCore = api;
})(typeof window !== 'undefined' ? window : null, () => {
  'use strict';
  const DAY = 86400000;
  const MODEL_DAYS = 1070;
  const WINDOWS = Object.freeze([
    { key: 'bottom2015', label: '2015年の底', start: '2014-10-01', end: '2015-12-31', mode: 'min' },
    { key: 'peak2017', label: '2017年の高値', start: '2016-01-01', end: '2018-01-31', mode: 'max' },
    { key: 'bottom2018', label: '2018年の底', start: '2018-02-01', end: '2019-12-31', mode: 'min' },
    { key: 'peak2021', label: '2021年の高値', start: '2020-01-01', end: '2022-03-31', mode: 'max' },
    { key: 'bottom2022', label: '2022年の底', start: '2022-04-01', end: '2023-12-31', mode: 'min' }
  ]);
  const toDay = value => {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? Math.floor(ms / DAY) * DAY : NaN;
  };
  const iso = ms => new Date(ms).toISOString().slice(0, 10);
  const diffDays = (a, b) => Math.round((b - a) / DAY);

  function normalizeCandles(candles, now = Date.now()) {
    const byDate = new Map();
    for (const candle of Array.isArray(candles) ? candles : []) {
      const day = toDay(candle?.date);
      const close = Number(candle?.close);
      if (Number.isFinite(day) && day <= now + DAY && Number.isFinite(close) && close > 0)
        byDate.set(day, { day, close });
    }
    return [...byDate.values()].sort((a, b) => a.day - b.day);
  }

  function cadence(points) {
    const gaps = [];
    for (let i = 1; i < points.length; i++) gaps.push(diffDays(points[i - 1].day, points[i].day));
    gaps.sort((a, b) => a - b);
    return gaps.length ? gaps[Math.floor(gaps.length / 2)] : null;
  }

  function windowExtreme(points, window, today) {
    const from = toDay(window.start), end = Math.min(toDay(window.end), today);
    const values = points.filter(p => p.day >= from && p.day <= end);
    const step = cadence(values);
    const fullWindow = today >= toDay(window.end);
    const edgeDays = step !== null ? Math.max(15, step * 3) : 15;
    const gaps = values.slice(1).map((v, i) => diffDays(values[i].day, v.day));
    const maxGap = gaps.length ? Math.max(...gaps) : Infinity;
    const valid = fullWindow && values.length >= 30 && step !== null && step <= 10 &&
      values[0].day - from <= edgeDays * DAY && toDay(window.end) - values[values.length - 1].day <= edgeDays * DAY &&
      maxGap <= 35;
    if (!valid) return { window, valid: false, count: values.length, maxGap, reason: !fullWindow ? '期間未終了' : '対象期間の履歴に不足・大きな欠落があります' };
    const extreme = values.reduce((a, b) => window.mode === 'min' ? (b.close < a.close ? b : a) : (b.close > a.close ? b : a));
    return { window, valid: true, count: values.length, maxGap, day: extreme.day, close: extreme.close };
  }

  function examine(candles, options = {}) {
    const now = Number.isFinite(options.now) ? options.now : Date.now();
    const today = toDay(new Date(now).toISOString());
    const points = normalizeCandles(candles, now);
    const source = String(options.source || '').toLowerCase();
    const resolution = cadence(points);
    const events = Object.fromEntries(WINDOWS.map(w => [w.key, windowExtreme(points, w, today)]));
    const recent = points.filter(p => p.day >= toDay('2024-01-01') && p.day <= today);
    const recentReady = events.bottom2022.valid && recent.length >= 30 && recent[0].day - toDay('2024-01-01') <= Math.max(15, (resolution || 7) * 3);
    const recentHigh = recentReady ? recent.reduce((a, b) => b.close > a.close ? b : a) : null;
    const definitions = [
      ['2015底 → 2017高値', 'bottom2015', 'peak2017', true],
      ['2018底 → 2021高値', 'bottom2018', 'peak2021', true],
      ['2022底 → 直近観測高値', 'bottom2022', null, false]
    ];
    const rows = definitions.map(([label, bottomKey, peakKey, complete]) => {
      const bottom = events[bottomKey];
      const peak = complete ? events[peakKey] : recentHigh ? { valid: true, day: recentHigh.day, close: recentHigh.close } : { valid: false };
      if (!bottom.valid || !peak.valid || peak.day <= bottom.day) return { label, complete, valid: false, reason: !bottom.valid ? bottom.reason : complete ? peak.reason : '直近期間の履歴が不足しています' };
      const days = diffDays(bottom.day, peak.day);
      return { label, complete, valid: true, bottom: { date: iso(bottom.day), close: bottom.close },
        peak: { date: iso(peak.day), close: peak.close }, predicted: iso(bottom.day + MODEL_DAYS * DAY),
        days, deviation: days - MODEL_DAYS, within90: Math.abs(days - MODEL_DAYS) <= 90 };
    });
    const completed = rows.filter(r => r.valid && r.complete);
    const recentLast = points[points.length - 1];
    const stale = !recentLast || diffDays(recentLast.day, today) > 21;
    return {
      modelDays: MODEL_DAYS, rows, events, count: points.length, source, resolution,
      first: points.length ? iso(points[0].day) : null, last: recentLast ? iso(recentLast.day) : null,
      stale, usable: completed.length > 0, completedCount: completed.length,
      meanAbsoluteError: completed.length ? completed.reduce((n, r) => n + Math.abs(r.deviation), 0) / completed.length : null,
      hits90: completed.filter(r => r.within90).length,
      note: '高値・底の探索期間は事後に定めたものです。過去への適合度は将来の予測精度を示しません。'
    };
  }
  return { examine, normalizeCandles, windowExtreme, WINDOWS, MODEL_DAYS, diffDays };
});
