// Bitcoin1070 PRO v11.4 - BTC 1070日サイクル + 半減期シナリオ
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
    nextHalving: '2028-04-20T00:00:00+09:00',
    futureHalvings: [
      '2028-04-20T00:00:00+09:00',
      '2032-03-27T00:00:00+09:00',
      '2036-03-01T00:00:00+09:00',
      '2040-02-15T00:00:00+09:00',
      '2044-01-30T00:00:00+09:00'
    ],
    historyCycles: [
      {
        label: '2015底 → 2017高値',
        prevPeak: '2013-12-04T00:00:00+09:00',
        bottom: '2015-01-14T00:00:00+09:00',
        peak: '2017-12-17T00:00:00+09:00',
        points: [[0,100],[120,120],[240,150],[360,210],[480,340],[600,560],[720,930],[840,1330],[960,1650],[1070,1940]]
      },
      {
        label: '2018底 → 2021高値',
        prevPeak: '2017-12-17T00:00:00+09:00',
        bottom: '2018-12-15T00:00:00+09:00',
        peak: '2021-11-10T00:00:00+09:00',
        points: [[0,100],[120,125],[240,155],[360,220],[480,330],[600,510],[720,880],[840,1280],[960,1820],[1070,2370]]
      },
      {
        label: '2022底 → 2025仮説高値',
        prevPeak: '2021-11-10T00:00:00+09:00',
        bottom: '2022-11-21T00:00:00+09:00',
        peak: '2025-10-15T00:00:00+09:00',
        points: [[0,100],[120,138],[240,188],[360,295],[480,250],[600,320],[720,470],[840,585],[960,690],[1070,820]]
      }
    ]
  });

  const LONG_TERM_SCENARIOS = Object.freeze({
    bear: {
      label: '弱気', color: '#ef5350', rates: [0.02, 0.035, 0.03, 0.025],
      halvingBonus: 1.03, preBottomFactor: 0.92, bottomWindowFactor: 0.97, postBottomFactor: 1.02
    },
    neutral: {
      label: '中立', color: '#f5a623', rates: [0.12, 0.09, 0.075, 0.06],
      halvingBonus: 1.10, preBottomFactor: 1.05, bottomWindowFactor: 1.08, postBottomFactor: 1.10
    },
    bull: {
      label: '強気', color: '#26a69a', rates: [0.22, 0.16, 0.12, 0.09],
      halvingBonus: 1.18, preBottomFactor: 1.14, bottomWindowFactor: 1.18, postBottomFactor: 1.15
    }
  });

  const HORIZON_YEARS = [5, 10, 15, 20];
  let historyChart = null;
  let futureChart = null;
  let currentMarket = { price: 0, change: 0, fearValue: null, fearLabel: '', cached: false };

  const $ = id => document.getElementById(id);
  const date = value => new Date(value);
  const addDays = (value, days) => new Date(date(value).getTime() + days * DAY);
  const daysBetween = (a, b) => Math.floor((date(b).getTime() - date(a).getTime()) / DAY);
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const fmt = value => date(value).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  const yen = value => `¥${Math.round(Number(value) || 0).toLocaleString('ja-JP')}`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

  function snapshot(nowValue = Date.now()) {
    const now = new Date(nowValue);
    const peak = date(CONFIG.assumedPeak);
    const bottomStart = date(CONFIG.bottomWindowStart);
    const bottomBase = date(CONFIG.bottomBase);
    const bottomEnd = date(CONFIG.bottomWindowEnd);
    const nextPeakBase = addDays(bottomBase, CONFIG.theoryDays);
    const nextPeakStart = addDays(bottomStart, CONFIG.theoryDays);
    const nextPeakEnd = addDays(bottomEnd, CONFIG.theoryDays);
    const nextHalving = date(CONFIG.nextHalving);
    const declineElapsed = Math.max(0, daysBetween(peak, now));
    const peakToBaseBottom = daysBetween(peak, bottomBase);
    let stage, stageEmoji, stageClass, headline, detail, nextEvent, nextEventDate, progress;

    if (now < peak) {
      stage = '天井形成候補'; stageEmoji = '🟠'; stageClass = 'forming';
      headline = 'ピーク候補へ向かう局面';
      detail = '過去サイクルと同様なら、過熱と急落の両方に備える期間です。';
      nextEvent = '想定ピーク'; nextEventDate = peak;
      progress = clamp((now - date(CONFIG.previousBottom)) / (peak - date(CONFIG.previousBottom)) * 100, 0, 100);
    } else if (now < bottomStart) {
      stage = '下落・底探し'; stageEmoji = '🔴'; stageClass = 'decline';
      headline = '高値から底候補へ向かう局面';
      detail = '高値から約10〜14か月後を底候補ゾーンとして監視します。焦って底を断定しません。';
      nextEvent = '底候補ゾーン開始'; nextEventDate = bottomStart;
      progress = clamp(declineElapsed / peakToBaseBottom * 100, 0, 100);
    } else if (now <= bottomEnd) {
      stage = '底候補ゾーン'; stageEmoji = '⚫'; stageClass = 'bottom';
      headline = '底形成を慎重に確認する局面';
      detail = '悲観・出来高・長期サポートを確認し、分割で判断する期間です。';
      nextEvent = '底候補ゾーン終了'; nextEventDate = bottomEnd;
      progress = clamp((now - bottomStart) / (bottomEnd - bottomStart) * 100, 0, 100);
    } else if (now < nextPeakStart) {
      stage = '次サイクル上昇期'; stageEmoji = '🟢'; stageClass = 'growth';
      headline = '底候補から1070日を数える局面';
      detail = '底を確定日ではなく仮置きし、1070日前後を次のピーク候補として追跡します。';
      nextEvent = '次回ピーク候補ゾーン開始'; nextEventDate = nextPeakStart;
      progress = clamp(daysBetween(bottomBase, now) / CONFIG.theoryDays * 100, 0, 100);
    } else {
      stage = '次回ピーク候補'; stageEmoji = '🔥'; stageClass = 'peak';
      headline = '1070日前後のピーク候補局面';
      detail = '過去傾向との一致を確認しつつ、価格・需給・マクロ環境を優先します。';
      nextEvent = '候補ゾーン終了'; nextEventDate = nextPeakEnd;
      progress = 100;
    }

    const remaining = Math.ceil((nextEventDate - now) / DAY);
    return {
      now, stage, stageEmoji, stageClass, headline, detail, progress,
      nextEvent, nextEventDate, remaining, declineElapsed,
      assumedPeak: peak, bottomStart, bottomBase, bottomEnd,
      nextPeakStart, nextPeakBase, nextPeakEnd,
      previousBottom: date(CONFIG.previousBottom),
      previousPeakTarget: addDays(CONFIG.previousBottom, CONFIG.theoryDays),
      nextHalving, halvingRemainingDays: Math.ceil((nextHalving - now) / DAY)
    };
  }

  function interpolate(points, x) {
    if (!points.length) return null;
    if (x <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i += 1) {
      const [x1, y1] = points[i];
      const [x0, y0] = points[i - 1];
      if (x <= x1) {
        const ratio = (x - x0) / Math.max(1, x1 - x0);
        return y0 + (y1 - y0) * ratio;
      }
    }
    return points[points.length - 1][1];
  }

  function buildScenarioSummary(s, market = {}) {
    const scenarios = {
      bear: {
        key: 'bear', label: '弱気', score: 0,
        bottomDate: s.bottomEnd, peakDate: addDays(s.bottomEnd, CONFIG.theoryDays),
        detail: `底が${fmt(s.bottomEnd)}付近まで長引き、次のピーク候補は${fmt(addDays(s.bottomEnd, CONFIG.theoryDays))}前後まで後ろ倒しになる想定。`,
        reason: []
      },
      neutral: {
        key: 'neutral', label: '中立', score: 0,
        bottomDate: s.bottomBase, peakDate: s.nextPeakBase,
        detail: `底を${fmt(s.bottomBase)}前後と仮置きし、${fmt(s.nextPeakBase)}前後を次のピーク候補とみる王道シナリオ。`,
        reason: []
      },
      bull: {
        key: 'bull', label: '強気', score: 0,
        bottomDate: s.bottomStart, peakDate: addDays(s.bottomStart, CONFIG.theoryDays),
        detail: `底が早めに${fmt(s.bottomStart)}付近で入り、1070日後の${fmt(addDays(s.bottomStart, CONFIG.theoryDays))}前後まで強く伸びる想定。`,
        reason: []
      }
    };

    if (s.now < s.bottomStart) {
      scenarios.bear.score += 2; scenarios.bear.reason.push('底候補ゾーン前で、まだ下落継続リスクが高い');
      scenarios.neutral.score += 1; scenarios.neutral.reason.push('底候補入りが近く、中立で様子見も成立');
    } else if (s.now <= s.bottomEnd) {
      scenarios.neutral.score += 2; scenarios.neutral.reason.push('今は底候補ゾーンで、最も無難なのは中立');
      scenarios.bear.score += 1; scenarios.bear.reason.push('悲観が深まれば底が遅れる可能性も残る');
      scenarios.bull.score += 1; scenarios.bull.reason.push('底が早めに固まるなら先回りの強気もありえる');
    } else if (s.now < s.nextPeakStart) {
      scenarios.bull.score += 2; scenarios.bull.reason.push('底候補通過後で、1070日カウント開始の上昇期入り');
      scenarios.neutral.score += 1; scenarios.neutral.reason.push('上昇開始でも中立管理は有効');
    } else {
      scenarios.bear.score += 1; scenarios.bear.reason.push('1070日ゴール接近では利確圧力に注意');
      scenarios.neutral.score += 1; scenarios.neutral.reason.push('ピーク候補帯では中立に戻す発想も重要');
      scenarios.bull.score += 1; scenarios.bull.reason.push('勢いが続けば上振れもありえる');
    }

    if (s.halvingRemainingDays > 0 && s.halvingRemainingDays <= 900) {
      scenarios.bull.score += 1; scenarios.bull.reason.push('次回半減期が視野に入り、中長期の需給材料になりやすい');
      scenarios.neutral.score += 1; scenarios.neutral.reason.push('半減期前の期待は中立ケースも支えやすい');
    }

    const fear = Number(market.fearValue);
    if (Number.isFinite(fear)) {
      if (fear <= 25) {
        scenarios.bull.score += 1; scenarios.bull.reason.push('極端な恐怖は長期では仕込み局面になりやすい');
        scenarios.bear.score += 1; scenarios.bear.reason.push('恐怖の継続は弱気継続も示唆');
      } else if (fear >= 75) {
        scenarios.bear.score += 1; scenarios.bear.reason.push('強欲圏では短期過熱リスクに注意');
        scenarios.neutral.score += 1; scenarios.neutral.reason.push('過熱時は中立へ戻す考えも妥当');
      }
    }

    const change = Number(market.change);
    if (Number.isFinite(change)) {
      if (change >= 5) {
        scenarios.bull.score += 1; scenarios.bull.reason.push('短期上昇モメンタムは強気を支援');
        scenarios.bear.score += 1; scenarios.bear.reason.push('急騰は反動安も意識');
      } else if (change <= -5) {
        scenarios.bear.score += 1; scenarios.bear.reason.push('短期急落は底探し長期化のサインにもなる');
        scenarios.neutral.score += 1; scenarios.neutral.reason.push('急落時ほど中立で分割対応がしやすい');
      }
    }

    const ordered = Object.values(scenarios).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const priority = { neutral: 3, bear: 2, bull: 1 };
      return priority[b.key] - priority[a.key];
    });
    const current = ordered[0];
    return { scenarios, current };
  }

  function renderCompact(prefix = '') {
    const s = snapshot();
    const summary = buildScenarioSummary(s, currentMarket);
    const get = id => document.getElementById(prefix + id);
    const days = get('days');
    const phase = get('theoryPhase');
    const target = get('theoryTarget');
    const bar = get('progressBar');
    const badge = get('homeScenarioBadge');
    const reason = get('homeScenarioReason');

    if (days) days.textContent = s.stage === '下落・底探し' ? `${s.declineElapsed.toLocaleString('ja-JP')}日` : `${Math.round(s.progress)}%`;
    if (phase) phase.textContent = `${s.stageEmoji} ${s.stage}`;
    if (target) target.textContent = s.remaining >= 0 ? `${s.nextEvent}まであと${s.remaining.toLocaleString('ja-JP')}日` : `${s.nextEvent}を${Math.abs(s.remaining).toLocaleString('ja-JP')}日通過`;
    if (bar) bar.style.width = `${clamp(s.progress, 0, 100).toFixed(1)}%`;
    if (badge) {
      badge.textContent = summary.current.label;
      badge.className = `cycle-badge ${summary.current.key}`;
    }
    if (reason) {
      reason.textContent = summary.current.reason[0] || summary.current.detail;
    }
    return s;
  }

  function renderPage(market = {}) {
    const s = snapshot();
    const summary = buildScenarioSummary(s, market);
    const set = (id, text) => { const el = $(id); if (el) el.textContent = text; };

    set('cycleStage', `${s.stageEmoji} ${s.stage}`);
    set('cycleHeadline', s.headline);
    set('cycleDetail', s.detail);
    set('cycleProgress', `${Math.round(s.progress)}%`);
    set('cycleNextEvent', s.remaining >= 0 ? `${s.nextEvent}まであと${s.remaining.toLocaleString('ja-JP')}日` : `${s.nextEvent}を通過`);
    const bar = $('cycleProgressBar'); if (bar) bar.style.width = `${clamp(s.progress, 0, 100)}%`;
    set('assumedPeakDate', fmt(s.assumedPeak));
    set('bottomWindowDate', `${fmt(s.bottomStart)}〜${fmt(s.bottomEnd)}`);
    set('bottomBaseDate', fmt(s.bottomBase));
    set('nextPeakWindowDate', `${fmt(s.nextPeakStart)}〜${fmt(s.nextPeakEnd)}`);
    set('nextPeakBaseDate', fmt(s.nextPeakBase));

    set('btcScenarioPrice', market.price > 0 ? `${yen(market.price)}${market.cached ? ' *' : ''}` : '取得失敗');
    set('btcScenarioFear', Number.isFinite(market.fearValue) ? `${market.fearValue} / ${market.fearLabel || ''}`.trim() : '取得失敗');
    set('btcScenarioHalving', s.halvingRemainingDays >= 0 ? `あと${s.halvingRemainingDays.toLocaleString('ja-JP')}日` : '予定日通過');
    const currentBadge = $('currentScenarioBadge');
    if (currentBadge) {
      currentBadge.textContent = summary.current.label;
      currentBadge.className = `cycle-badge ${summary.current.key}`;
    }
    set('currentScenarioLabel', `現状判定：${summary.current.label}シナリオ優勢`);
    set('currentScenarioReason', summary.current.reason.slice(0, 2).join(' ／ ') || summary.current.detail);

    ['bear', 'neutral', 'bull'].forEach(key => {
      const item = summary.scenarios[key];
      set(`${key}ScenarioDate`, `底候補 ${fmt(item.bottomDate)}`);
      set(`${key}ScenarioText`, item.detail);
      set(`${key}ScenarioPeak`, `1070日後のピーク候補：${fmt(item.peakDate)}`);
      const card = $(`${key}ScenarioCard`);
      if (card) card.classList.toggle('active-scenario', summary.current.key === key);
    });
  }

  function renderHistoryTable() {
    const body = $('cycleHistoryTableBody');
    if (!body) return;
    const rows = CONFIG.historyCycles.map(cycle => {
      const bottom = date(cycle.bottom);
      const theoryPeak = addDays(bottom, CONFIG.theoryDays);
      const peakToBottom = Math.abs(daysBetween(cycle.prevPeak, cycle.bottom));
      const actualGap = Math.abs(daysBetween(cycle.bottom, cycle.peak));
      const diff = actualGap - CONFIG.theoryDays;
      const comment = diff === 0
        ? '1070日とほぼ一致'
        : diff > 0
          ? `理論より${diff}日遅いが近い`
          : `理論より${Math.abs(diff)}日早いが近い`;
      return `<tr><td>${esc(cycle.label)}</td><td>${peakToBottom.toLocaleString('ja-JP')}日</td><td>${fmt(bottom)}</td><td>${fmt(theoryPeak)}</td><td>${comment}</td></tr>`;
    }).join('');
    body.innerHTML = rows;
    const summary = $('cycleHistorySummary');
    if (summary) summary.textContent = '2015底→2017高値、2018底→2021高値、2022底→2025仮説高値の3本を、底値=100で比較しています。';
  }

  function renderHistoryChart() {
    const canvas = $('cycleHistoryChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const labels = Array.from({ length: 37 }, (_, i) => i * 30);
    const palette = ['#66bb6a', '#42a5f5', '#f5a623'];
    const datasets = CONFIG.historyCycles.map((cycle, index) => ({
      label: cycle.label,
      data: labels.map(day => Math.round(interpolate(cycle.points, day))),
      borderColor: palette[index % palette.length],
      backgroundColor: 'transparent',
      tension: 0.25,
      borderWidth: index === 2 ? 3 : 2,
      pointRadius: 0
    }));
    if (historyChart) historyChart.destroy();
    historyChart = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              title: items => `底から ${items[0].label}日`,
              label: ctx => `${ctx.dataset.label}: ${ctx.raw.toLocaleString('ja-JP')}（底値=100）`
            }
          }
        },
        scales: {
          x: { title: { display: true, text: '底からの日数' } },
          y: { title: { display: true, text: '底値=100 の指数' }, beginAtZero: false }
        }
      }
    });
  }

  function countFutureHalvings(years) {
    const now = new Date();
    const future = new Date(now);
    future.setFullYear(future.getFullYear() + years);
    return CONFIG.futureHalvings.filter(value => date(value) > now && date(value) <= future).length;
  }

  function projectBTCPrice(currentPrice, years, scenarioKey, s) {
    const conf = LONG_TERM_SCENARIOS[scenarioKey];
    if (!(currentPrice > 0) || !conf) return 0;
    const segments = [5, 5, 5, 5];
    let remaining = years;
    let value = currentPrice;
    segments.forEach((segmentYears, index) => {
      const yearsInSegment = Math.max(0, Math.min(remaining, segmentYears));
      if (yearsInSegment > 0) value *= Math.pow(1 + conf.rates[index], yearsInSegment);
      remaining -= yearsInSegment;
    });
    const halvings = countFutureHalvings(years);
    value *= Math.pow(conf.halvingBonus, halvings);

    if (s.now < s.bottomStart && years >= 3) value *= conf.preBottomFactor;
    else if (s.now <= s.bottomEnd && years >= 3) value *= conf.bottomWindowFactor;
    else if (s.now < s.nextPeakStart) value *= conf.postBottomFactor;

    return Math.max(0, value);
  }

  function renderFutureScenarioTable(market = {}) {
    const body = $('btcScenarioTableBody');
    if (!body) return;
    const s = snapshot();
    const rows = HORIZON_YEARS.map(years => {
      const bear = projectBTCPrice(market.price, years, 'bear', s);
      const neutral = projectBTCPrice(market.price, years, 'neutral', s);
      const bull = projectBTCPrice(market.price, years, 'bull', s);
      return `<tr><td>${years}年後</td><td>${yen(bear)}</td><td>${yen(neutral)}</td><td>${yen(bull)}</td></tr>`;
    }).join('');
    body.innerHTML = rows;
  }

  function renderFutureChart(market = {}) {
    const canvas = $('cycleFutureChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const s = snapshot();
    const labels = ['現在', ...HORIZON_YEARS.map(year => `${year}年後`)];
    const datasets = Object.entries(LONG_TERM_SCENARIOS).map(([key, conf]) => ({
      label: conf.label,
      data: [market.price || 0, ...HORIZON_YEARS.map(year => Math.round(projectBTCPrice(market.price, year, key, s)))],
      borderColor: conf.color,
      backgroundColor: 'transparent',
      tension: 0.28,
      borderWidth: key === 'neutral' ? 3 : 2,
      pointRadius: 3
    }));
    if (futureChart) futureChart.destroy();
    futureChart = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${yen(ctx.raw)}` } }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => value >= 100000000 ? `${(value / 100000000).toFixed(1)}億` : value >= 10000 ? `${Math.round(value / 10000)}万` : value
            }
          }
        }
      }
    });
  }

  async function fetchBitcoinContext() {
    const cacheKey = 'bitcoin1070_cycle_context_v11_4';
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch (_) {}
    const result = { price: Number(cached?.price) || 0, change: Number(cached?.change) || 0, fearValue: cached?.fearValue === null || cached?.fearValue === undefined ? null : Number(cached.fearValue), fearLabel: cached?.fearLabel || '', cached: Boolean(cached) };

    try {
      const response = await fetch('https://bitcoin1070-api.531unchi.workers.dev?mode=crypto&ids=bitcoin', { cache: 'no-store' });
      if (!response.ok) throw new Error(`BTC price error ${response.status}`);
      const data = await response.json();
      const price = Number(data?.prices?.bitcoin?.jpy);
      const change = Number(data?.prices?.bitcoin?.jpy_24h_change) || 0;
      if (price > 0) {
        result.price = price;
        result.change = change;
        result.cached = false;
      }
    } catch (error) {
      console.warn('BTC価格取得失敗、キャッシュを利用します', error);
    }

    try {
      const response = await fetch('https://api.alternative.me/fng/?limit=1', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Fear & Greed error ${response.status}`);
      const data = await response.json();
      const fearValue = Number(data?.data?.[0]?.value);
      const fearLabel = data?.data?.[0]?.value_classification || '';
      if (Number.isFinite(fearValue)) {
        result.fearValue = fearValue;
        result.fearLabel = fearLabel;
        result.cached = false;
      }
    } catch (error) {
      console.warn('Fear & Greed取得失敗、キャッシュを利用します', error);
    }

    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        price: result.price, change: result.change,
        fearValue: Number.isFinite(result.fearValue) ? result.fearValue : null,
        fearLabel: result.fearLabel || '', fetchedAt: new Date().toISOString()
      }));
    } catch (_) {}
    return result;
  }

  async function initPage() {
    renderCompact();
    if (!$('cycleStage')) return;
    renderPage(currentMarket);
    renderHistoryTable();
    renderHistoryChart();
    try {
      currentMarket = await fetchBitcoinContext();
    } catch (error) {
      console.error(error);
    }
    renderPage(currentMarket);
    renderFutureScenarioTable(currentMarket);
    renderFutureChart(currentMarket);
    renderCompact();
  }

  window.Bitcoin1070Cycle = { CONFIG, snapshot, renderCompact, renderPage, fmt };
  document.addEventListener('DOMContentLoaded', initPage);
})();
