// Bitcoin1070 PRO v11.7 - BTC 実チャート延長 × 半減期 × 1070日理論
(() => {
  'use strict';

  const DAY = 86400000;
  const CONFIG = Object.freeze({
    theoryDays: 1070,
    previousBottom: '2022-11-21T00:00:00+09:00',
    assumedPeak: '2025-10-15T00:00:00+09:00',
    bottomWindowStart: '2026-08-01T00:00:00+09:00',
    bottomBase: '2026-10-15T00:00:00+09:00',
    bottomWindowEnd: '2026-12-31T23:59:59+09:00',
    noteUrl: 'https://note.com/mr_japanpapac',
    futureHalvings: [
      '2028-04-20T00:00:00+09:00',
      '2032-03-27T00:00:00+09:00',
      '2036-03-01T00:00:00+09:00',
      '2040-02-15T00:00:00+09:00'
    ],
    historyCycles: [
      { label: '2015底 → 2017高値', prevPeak: '2013-12-04T00:00:00+09:00', bottom: '2015-01-14T00:00:00+09:00', peak: '2017-12-17T00:00:00+09:00' },
      { label: '2018底 → 2021高値', prevPeak: '2017-12-17T00:00:00+09:00', bottom: '2018-12-15T00:00:00+09:00', peak: '2021-11-10T00:00:00+09:00' },
      { label: '2022底 → 2025仮説高値', prevPeak: '2021-11-10T00:00:00+09:00', bottom: '2022-11-21T00:00:00+09:00', peak: '2025-10-15T00:00:00+09:00' }
    ],
    profiles: {
      bear: {
        label: '弱気', color: '#ef5350', bottomFactorNow: 0.58, peakMultipliers: [2.1, 1.75, 1.55, 1.4], retrace: [0.46, 0.48, 0.5, 0.52], bottomMonthsAfterPeak: [14, 14, 13, 13]
      },
      neutral: {
        label: '中立', color: '#f5a623', bottomFactorNow: 0.76, peakMultipliers: [3.2, 2.5, 2.05, 1.8], retrace: [0.44, 0.46, 0.48, 0.5], bottomMonthsAfterPeak: [12, 12, 11, 11]
      },
      bull: {
        label: '強気', color: '#26a69a', bottomFactorNow: 0.94, peakMultipliers: [4.7, 3.35, 2.55, 2.1], retrace: [0.42, 0.44, 0.46, 0.48], bottomMonthsAfterPeak: [10, 10, 10, 9]
      }
    }
  });

  let realChart = null;
  let currentMarket = { price: 0, change: 0, fearValue: null, fearLabel: '', cached: false };

  const $ = id => document.getElementById(id);
  const date = value => new Date(value);
  const addDays = (value, days) => new Date(date(value).getTime() + days * DAY);
  const addMonths = (value, months) => {
    const d = new Date(date(value));
    d.setMonth(d.getMonth() + months);
    return d;
  };
  const daysBetween = (a, b) => Math.floor((date(b).getTime() - date(a).getTime()) / DAY);
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const fmt = value => date(value).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  const fmtShort = value => date(value).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' });
  const yen = value => `¥${Math.round(Number(value) || 0).toLocaleString('ja-JP')}`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const toYenUnit = value => {
    const n = Number(value) || 0;
    if (n >= 100000000) return `${(n / 100000000).toFixed(2)}億円`;
    if (n >= 10000) return `${(n / 10000).toFixed(0)}万円`;
    return `${Math.round(n).toLocaleString('ja-JP')}円`;
  };

  function snapshot(nowValue = Date.now()) {
    const now = new Date(nowValue);
    const peak = date(CONFIG.assumedPeak);
    const bottomStart = date(CONFIG.bottomWindowStart);
    const bottomBase = date(CONFIG.bottomBase);
    const bottomEnd = date(CONFIG.bottomWindowEnd);
    const nextPeakBase = addDays(bottomBase, CONFIG.theoryDays);
    const nextPeakStart = addDays(bottomStart, CONFIG.theoryDays);
    const nextPeakEnd = addDays(bottomEnd, CONFIG.theoryDays);
    const nextHalving = date(CONFIG.futureHalvings[0]);
    const declineElapsed = Math.max(0, daysBetween(peak, now));
    const peakToBaseBottom = daysBetween(peak, bottomBase);
    let stage, stageEmoji, headline, detail, nextEvent, nextEventDate, progress;

    if (now < peak) {
      stage = '天井形成候補'; stageEmoji = '🟠';
      headline = 'ピーク候補へ向かう局面';
      detail = '過熱と急落の両方に備える期間です。';
      nextEvent = '想定ピーク'; nextEventDate = peak;
      progress = clamp((now - date(CONFIG.previousBottom)) / (peak - date(CONFIG.previousBottom)) * 100, 0, 100);
    } else if (now < bottomStart) {
      stage = '下落・底探し'; stageEmoji = '🔴';
      headline = '高値から底候補へ向かう局面';
      detail = '高値から約10〜14か月後を底候補ゾーンとして監視します。';
      nextEvent = '底候補ゾーン開始'; nextEventDate = bottomStart;
      progress = clamp(declineElapsed / peakToBaseBottom * 100, 0, 100);
    } else if (now <= bottomEnd) {
      stage = '底候補ゾーン'; stageEmoji = '⚫';
      headline = '底形成を慎重に確認する局面';
      detail = '悲観・出来高・長期サポートを確認し、分割で判断する期間です。';
      nextEvent = '底候補ゾーン終了'; nextEventDate = bottomEnd;
      progress = clamp((now - bottomStart) / (bottomEnd - bottomStart) * 100, 0, 100);
    } else if (now < nextPeakStart) {
      stage = '次サイクル上昇期'; stageEmoji = '🟢';
      headline = '底候補から1070日を数える局面';
      detail = '底を確定日ではなく仮置きし、1070日前後を次のピーク候補として追跡します。';
      nextEvent = '次回ピーク候補ゾーン開始'; nextEventDate = nextPeakStart;
      progress = clamp(daysBetween(bottomBase, now) / CONFIG.theoryDays * 100, 0, 100);
    } else {
      stage = '次回ピーク候補'; stageEmoji = '🔥';
      headline = '1070日前後のピーク候補局面';
      detail = '過去傾向との一致を確認しつつ、価格・需給・マクロ環境を優先します。';
      nextEvent = '候補ゾーン終了'; nextEventDate = nextPeakEnd;
      progress = 100;
    }

    return {
      now, stage, stageEmoji, headline, detail, progress,
      nextEvent, nextEventDate, remaining: Math.ceil((nextEventDate - now) / DAY),
      declineElapsed,
      assumedPeak: peak, bottomStart, bottomBase, bottomEnd,
      nextPeakStart, nextPeakBase, nextPeakEnd,
      nextHalving, halvingRemainingDays: Math.ceil((nextHalving - now) / DAY)
    };
  }

  function geometricInterpolate(startDate, startValue, endDate, endValue, targetDate) {
    const a = date(startDate).getTime();
    const b = date(endDate).getTime();
    const t = clamp((date(targetDate).getTime() - a) / Math.max(1, (b - a)), 0, 1);
    if (startValue <= 0 || endValue <= 0) return 0;
    return startValue * Math.pow(endValue / startValue, t);
  }

  function buildRoadmaps(currentPrice) {
    if (!(Number(currentPrice) > 0)) return null;
    const s = snapshot();
    const currentDate = new Date();
    const currentPoint = { label: '現在', date: currentDate, price: currentPrice, eventKey: 'current' };
    const maps = {};

    Object.entries(CONFIG.profiles).forEach(([key, profile]) => {
      const milestones = [currentPoint];
      let bottomDate = key === 'bear' ? s.bottomEnd : key === 'neutral' ? s.bottomBase : s.bottomStart;
      let bottomPrice = currentPrice * profile.bottomFactorNow;
      milestones.push({ label: '底候補', date: bottomDate, price: bottomPrice, eventKey: 'bottom1' });

      let cycleBottomDate = bottomDate;
      let cycleBottomPrice = bottomPrice;

      CONFIG.futureHalvings.forEach((halvingDateValue, idx) => {
        const peakDate = addDays(cycleBottomDate, CONFIG.theoryDays);
        const peakPrice = cycleBottomPrice * profile.peakMultipliers[idx];
        const halvingDate = date(halvingDateValue);
        if (halvingDate > cycleBottomDate && halvingDate < peakDate) {
          milestones.push({
            label: `${halvingDate.getFullYear()}半減期`,
            date: halvingDate,
            price: geometricInterpolate(cycleBottomDate, cycleBottomPrice, peakDate, peakPrice, halvingDate),
            eventKey: `halving${idx + 1}`
          });
        }
        milestones.push({ label: `${peakDate.getFullYear()}ピーク候補`, date: peakDate, price: peakPrice, eventKey: `peak${idx + 1}` });

        const nextBottomDate = addMonths(peakDate, profile.bottomMonthsAfterPeak[idx]);
        const nextBottomPrice = peakPrice * profile.retrace[idx];
        milestones.push({ label: `${nextBottomDate.getFullYear()}底候補`, date: nextBottomDate, price: nextBottomPrice, eventKey: `nextBottom${idx + 1}` });

        cycleBottomDate = nextBottomDate;
        cycleBottomPrice = nextBottomPrice;
      });

      maps[key] = { key, profile, milestones };
    });

    return maps;
  }

  function buildScenarioSummary(s, market, maps) {
    const summary = {
      bear: { key: 'bear', label: '弱気', score: 0, reason: [] },
      neutral: { key: 'neutral', label: '中立', score: 0, reason: [] },
      bull: { key: 'bull', label: '強気', score: 0, reason: [] }
    };

    if (s.now < s.bottomStart) {
      summary.bear.score += 2; summary.bear.reason.push('まだ底候補ゾーン前で、下落継続リスクが高い');
      summary.neutral.score += 1; summary.neutral.reason.push('底候補入り前で様子見も有効');
    } else if (s.now <= s.bottomEnd) {
      summary.neutral.score += 2; summary.neutral.reason.push('今は底候補ゾーンで、中立判断が最もしやすい');
      summary.bear.score += 1; summary.bear.reason.push('恐怖継続なら底が後ろへずれる可能性がある');
      summary.bull.score += 1; summary.bull.reason.push('底が早めに入れば強気反転もありえる');
    } else if (s.now < s.nextPeakStart) {
      summary.bull.score += 2; summary.bull.reason.push('底候補通過後の上昇期入りを想定しやすい');
      summary.neutral.score += 1; summary.neutral.reason.push('上昇期でも中立管理は有効');
    } else {
      summary.bear.score += 1; summary.bear.reason.push('1070日ゴール接近では利確圧力に注意');
      summary.neutral.score += 1; summary.neutral.reason.push('ピーク候補帯では中立回帰も重要');
      summary.bull.score += 1; summary.bull.reason.push('勢い継続なら上振れ余地も残る');
    }

    if (s.halvingRemainingDays > 0 && s.halvingRemainingDays <= 950) {
      summary.bull.score += 1; summary.bull.reason.push('次回半減期が視野に入り、中長期需給の追い風になりやすい');
      summary.neutral.score += 1; summary.neutral.reason.push('半減期前の期待は中立ケースも支えやすい');
    }

    const fear = Number(market.fearValue);
    if (Number.isFinite(fear)) {
      if (fear <= 25) {
        summary.bull.score += 1; summary.bull.reason.push('極端な恐怖は長期では仕込み局面になりやすい');
        summary.bear.score += 1; summary.bear.reason.push('恐怖の長期化は弱気継続も示唆');
      } else if (fear >= 75) {
        summary.bear.score += 1; summary.bear.reason.push('強欲圏では短期過熱リスクに注意');
        summary.neutral.score += 1; summary.neutral.reason.push('過熱時は一度中立へ戻す発想も有効');
      }
    }

    const change = Number(market.change);
    if (Number.isFinite(change)) {
      if (change >= 5) {
        summary.bull.score += 1; summary.bull.reason.push('短期上昇モメンタムは強気を支援');
      } else if (change <= -5) {
        summary.bear.score += 1; summary.bear.reason.push('短期急落は底探し長期化のサインにもなる');
        summary.neutral.score += 1; summary.neutral.reason.push('急落時ほど中立で分割対応がしやすい');
      }
    }

    const ordered = Object.values(summary).sort((a, b) => b.score - a.score || ['neutral','bear','bull'].indexOf(a.key) - ['neutral','bear','bull'].indexOf(b.key));
    const current = ordered[0];

    const cardData = Object.fromEntries(Object.entries(maps).map(([key, map]) => {
      const bottom = map.milestones.find(item => item.eventKey === 'bottom1');
      const peak = map.milestones.find(item => item.eventKey === 'peak1');
      const nextBottom = map.milestones.find(item => item.eventKey === 'nextBottom1');
      return [key, { bottom, peak, nextBottom }];
    }));

    return { current, summary, cardData };
  }

  function renderCompact() {
    const s = snapshot();
    const hasPrice = Number(currentMarket.price) > 0;
    const maps = hasPrice ? buildRoadmaps(currentMarket.price) : null;
    const summary = maps ? buildScenarioSummary(s, currentMarket, maps) : null;
    if ($('days')) $('days').textContent = s.stage === '下落・底探し' ? `${s.declineElapsed.toLocaleString('ja-JP')}日` : `${Math.round(s.progress)}%`;
    if ($('theoryPhase')) $('theoryPhase').textContent = `${s.stageEmoji} ${s.stage}`;
    if ($('theoryTarget')) $('theoryTarget').textContent = s.remaining >= 0 ? `${s.nextEvent}まであと${s.remaining.toLocaleString('ja-JP')}日` : `${s.nextEvent}を通過`;
    if ($('progressBar')) $('progressBar').style.width = `${clamp(s.progress, 0, 100).toFixed(1)}%`;
    if ($('homeScenarioBadge')) {
      $('homeScenarioBadge').textContent = summary ? summary.current.label : '価格待ち';
      $('homeScenarioBadge').className = `cycle-badge ${summary ? summary.current.key : 'neutral'}`;
    }
    if ($('homeScenarioReason')) $('homeScenarioReason').textContent = summary ? (summary.current.reason[0] || '半減期と1070日理論から現在シナリオを判定します。') : 'BTC価格取得後に予想を表示します。';
    if ($('halving')) $('halving').textContent = `${s.halvingRemainingDays.toLocaleString('ja-JP')}日`;
  }

  function renderPage(market) {
    if (!$('cycleStage')) return;
    const s = snapshot();
    const maps = buildRoadmaps(Number(market.price));
    const state = maps ? buildScenarioSummary(s, market, maps) : null;
    const set = (id, text) => { const el = $(id); if (el) el.textContent = text; };

    set('cycleStage', `${s.stageEmoji} ${s.stage}`);
    set('cycleHeadline', s.headline);
    set('cycleDetail', s.detail);
    set('cycleProgress', `${Math.round(s.progress)}%`);
    set('cycleNextEvent', s.remaining >= 0 ? `${s.nextEvent}まであと${s.remaining.toLocaleString('ja-JP')}日` : `${s.nextEvent}を通過`);
    if ($('cycleProgressBar')) $('cycleProgressBar').style.width = `${clamp(s.progress, 0, 100)}%`;

    set('assumedPeakDate', fmt(s.assumedPeak));
    set('bottomWindowDate', `${fmt(s.bottomStart)}〜${fmt(s.bottomEnd)}`);
    set('bottomBaseDate', fmt(s.bottomBase));
    set('nextHalvingDate', fmt(s.nextHalving));
    set('nextPeakBaseDate', fmt(s.nextPeakBase));

    set('btcScenarioPrice', market.price > 0 ? `${yen(market.price)}${market.cached ? ' *' : ''}` : '取得失敗');
    set('btcScenarioFear', Number.isFinite(market.fearValue) ? `${market.fearValue} / ${market.fearLabel || ''}`.trim() : '取得失敗');
    set('btcScenarioHalving', s.halvingRemainingDays >= 0 ? `あと${s.halvingRemainingDays.toLocaleString('ja-JP')}日` : '予定日通過');

    if ($('currentScenarioBadge')) {
      $('currentScenarioBadge').textContent = state ? state.current.label : '価格取得失敗';
      $('currentScenarioBadge').className = `cycle-badge ${state ? state.current.key : 'neutral'}`;
    }
    set('currentScenarioLabel', state ? `現状判定：${state.current.label}シナリオ優勢` : 'BTC価格を取得できませんでした');
    set('currentScenarioReason', state ? (state.current.reason.slice(0, 2).join(' ／ ') || '市場状況とサイクル進捗から判定しています。') : '価格がない状態では予想値を計算しません。API更新後に再読み込みしてください。');

    ['bear','neutral','bull'].forEach(key => {
      const el = $(`${key}ScenarioCard`);
      if (!maps || !state) {
        set(`${key}ScenarioDate`, '価格取得後に表示');
        set(`${key}ScenarioText`, '現在価格が取得できていないため、誤った予想値は表示しません。');
        set(`${key}ScenarioPeak`, 'APIを更新して再読み込みしてください。');
        if (el) el.classList.remove('active-scenario');
        return;
      }
      const card = state.cardData[key];
      const bottom = card.bottom, peak = card.peak, nextBottom = card.nextBottom;
      set(`${key}ScenarioDate`, `底候補 ${fmt(bottom.date)} ${yen(bottom.price)}`);
      set(`${key}ScenarioText`, `次回ピーク候補は ${fmt(peak.date)} ごろ ${toYenUnit(peak.price)}。その後の底候補は ${fmt(nextBottom.date)} ごろ ${toYenUnit(nextBottom.price)} を想定。`);
      set(`${key}ScenarioPeak`, '流れ：底 → 半減期 → ピーク候補 → 次の底候補');
      if (el) el.classList.toggle('active-scenario', state.current.key === key);
    });

    renderHistoryTable();
    if (maps) renderRoadmapTable(maps);
    else renderRoadmapUnavailable();
    return { s, maps };
  }

  function renderHistoryTable() {
    const body = $('cycleHistoryTableBody');
    if (!body) return;
    body.innerHTML = CONFIG.historyCycles.map(cycle => {
      const theoryPeak = addDays(cycle.bottom, CONFIG.theoryDays);
      const peakToBottom = Math.abs(daysBetween(cycle.prevPeak, cycle.bottom));
      const actualGap = Math.abs(daysBetween(cycle.bottom, cycle.peak));
      const diff = actualGap - CONFIG.theoryDays;
      const note = diff === 0 ? '1070日とほぼ一致' : diff > 0 ? `理論より${diff}日遅い` : `理論より${Math.abs(diff)}日早い`;
      return `<tr><td>${esc(cycle.label)}</td><td>${peakToBottom.toLocaleString('ja-JP')}日</td><td>${fmt(cycle.bottom)}</td><td>${fmt(theoryPeak)}</td><td>${note}</td></tr>`;
    }).join('');
  }

  function renderRoadmapTable(maps) {
    const body = $('halvingRoadmapTableBody');
    if (!body) return;
    const rows = [
      { label: '次の底候補', key: 'bottom1' },
      { label: '2028半減期', key: 'halving1' },
      { label: '2029ピーク候補', key: 'peak1' },
      { label: 'その後の底候補', key: 'nextBottom1' },
      { label: '2032半減期', key: 'halving2' },
      { label: '2033/34ピーク候補', key: 'peak2' },
      { label: 'その後の底候補', key: 'nextBottom2' },
      { label: '2036半減期', key: 'halving3' },
      { label: '2037/38ピーク候補', key: 'peak3' },
      { label: 'その後の底候補', key: 'nextBottom3' },
      { label: '2040半減期', key: 'halving4' },
      { label: '2041/42ピーク候補', key: 'peak4' }
    ];
    body.innerHTML = rows.map(row => {
      const cells = ['bear','neutral','bull'].map(key => {
        const item = maps[key].milestones.find(m => m.eventKey === row.key);
        if (!item) return '<td>--</td>';
        return `<td><strong>${fmtShort(item.date)}</strong><br><span>${yen(item.price)}</span></td>`;
      }).join('');
      return `<tr><td>${row.label}</td>${cells}</tr>`;
    }).join('');
  }

  function renderRoadmapUnavailable() {
    const body = $('halvingRoadmapTableBody');
    if (body) body.innerHTML = '<tr><td colspan="4">BTC価格を取得できないため、予想値は表示していません。</td></tr>';
  }

  async function fetchBitcoinContext() {
    const cacheKey = 'bitcoin1070_cycle_context_v11_6';
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch (_) {}
    const result = {
      price: Number(cached?.price) > 0 ? Number(cached.price) : 0,
      change: Number(cached?.change) || 0,
      fearValue: cached?.fearValue == null ? null : Number(cached.fearValue),
      fearLabel: cached?.fearLabel || '',
      cached: Boolean(Number(cached?.price) > 0)
    };

    try {
      const response = await fetch('https://bitcoin1070-api.531unchi.workers.dev?mode=btc-cycle', { cache: 'no-store' });
      if (!response.ok) throw new Error(`BTC cycle error ${response.status}`);
      const data = await response.json();
      const price = Number(data?.currentPrice);
      if (price > 0) {
        result.price = price;
        result.cached = false;
      }
    } catch (error) {
      console.warn('BTC価格取得失敗、保存済み価格を確認します', error);
    }

    try {
      const response = await fetch('https://bitcoin1070-api.531unchi.workers.dev?mode=crypto&ids=bitcoin', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        const price = Number(data?.prices?.bitcoin?.jpy);
        const change = Number(data?.prices?.bitcoin?.jpy_24h_change);
        if (price > 0) result.price = price;
        if (Number.isFinite(change)) result.change = change;
      }
    } catch (error) {
      console.warn('BTC24時間変動の取得に失敗しました', error);
    }

    try {
      const response = await fetch('https://bitcoin1070-api.531unchi.workers.dev?mode=fear-greed', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Fear & Greed error ${response.status}`);
      const data = await response.json();
      const fearValue = Number(data?.value);
      if (Number.isFinite(fearValue)) {
        result.fearValue = fearValue;
        result.fearLabel = String(data?.classification || '');
      }
    } catch (error) {
      console.warn('Fear & Greed取得失敗、保存済み値を確認します', error);
    }

    try {
      localStorage.setItem(cacheKey, JSON.stringify({ ...result, fetchedAt: new Date().toISOString() }));
    } catch (_) {}
    return result;
  }

  async function fetchHistoricalBTC() {
    const cacheKey = 'bitcoin1070_btc_history_v11_6';
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch (_) {}

    try {
      const response = await fetch('https://bitcoin1070-api.531unchi.workers.dev?mode=btc-cycle', { cache: 'no-store' });
      if (!response.ok) throw new Error(`history error ${response.status}`);
      const data = await response.json();
      const candles = Array.isArray(data?.candles) ? data.candles : [];
      const points = candles
        .map(item => ({ x: new Date(item.date).getTime(), y: Number(item.close) }))
        .filter(item => Number.isFinite(item.x) && item.y > 0 && new Date(item.x).getFullYear() >= 2016);
      if (points.length < 100) throw new Error('履歴データが不足しています');
      try { localStorage.setItem(cacheKey, JSON.stringify({ points, source: data?.source || '', fetchedAt: new Date().toISOString() })); } catch (_) {}
      return { points, cached: false, source: data?.source || '' };
    } catch (error) {
      console.warn('BTC履歴取得失敗、キャッシュ利用', error);
      const points = Array.isArray(cached?.points) ? cached.points.filter(item => Number(item?.y) > 0) : [];
      return { points, cached: true, source: cached?.source || '' };
    }
  }

  function renderRealChart(history, maps) {
    const canvas = $('realCycleChart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (!maps) {
      const note = $('realChartNote');
      if (note) note.textContent = 'BTC価格を取得できないため、予想ラインは表示していません。APIを更新して再読み込みしてください。';
      return;
    }
    const datasets = [];

    if (history.points?.length) {
      datasets.push({
        label: `実BTC/JPY${history.cached ? '（キャッシュ）' : ''}`,
        data: history.points,
        borderColor: '#5b8cff',
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.05,
        parsing: false,
        order: 1
      });
    }

    ['bear','neutral','bull'].forEach(key => {
      const map = maps[key];
      const forecastPoints = map.milestones.map(item => ({ x: date(item.date).getTime(), y: Number(item.price) }));
      datasets.push({
        label: `${map.profile.label}予想`,
        data: forecastPoints,
        borderColor: map.profile.color,
        backgroundColor: 'transparent',
        borderWidth: key === 'neutral' ? 3 : 2,
        borderDash: [8, 6],
        pointRadius: 2,
        pointHoverRadius: 4,
        tension: 0.12,
        parsing: false,
        order: 2
      });
    });

    if (realChart) realChart.destroy();
    realChart = new Chart(canvas, {
      type: 'line',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: false },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              title: items => items[0] ? fmtShort(items[0].parsed.x) : '',
              label: ctx => `${ctx.dataset.label}: ${yen(ctx.parsed.y)}`
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            ticks: {
              callback: value => new Date(Number(value)).getFullYear().toString(),
              maxTicksLimit: 8
            },
            grid: { color: 'rgba(255,255,255,0.06)' }
          },
          y: {
            type: 'logarithmic',
            ticks: {
              callback: value => {
                const num = Number(value);
                if (![1000,10000,100000,1000000,10000000,100000000,1000000000].includes(num)) return '';
                return num >= 100000000 ? `${num / 100000000}億` : num >= 10000 ? `${num / 10000}万` : num.toLocaleString('ja-JP');
              }
            },
            grid: { color: 'rgba(255,255,255,0.05)' }
          }
        }
      }
    });

    const note = $('realChartNote');
    if (note) {
      const neutralPeak = maps.neutral.milestones.find(item => item.eventKey === 'peak1');
      const neutralBottom = maps.neutral.milestones.find(item => item.eventKey === 'bottom1');
      const afterBottom = maps.neutral.milestones.find(item => item.eventKey === 'nextBottom1');
      note.textContent = `青線は実際のBTC/JPY長期チャート、破線は延長予想です。中立シナリオでは ${fmt(neutralBottom.date)} ごろ底候補 ${yen(neutralBottom.price)}、${fmt(neutralPeak.date)} ごろ次回ピーク候補 ${yen(neutralPeak.price)}、その後 ${fmt(afterBottom.date)} ごろ底候補 ${yen(afterBottom.price)} を想定します。`;
    }
  }

  async function initPage() {
    renderCompact();
    if (!$('cycleStage')) return;

    currentMarket = await fetchBitcoinContext();
    renderCompact();
    const state = renderPage(currentMarket);
    const history = await fetchHistoricalBTC();
    renderRealChart(history, state?.maps || null);
  }

  window.Bitcoin1070Cycle = { CONFIG, snapshot, renderCompact, fmt, buildRoadmaps };
  document.addEventListener('DOMContentLoaded', initPage);
})();
