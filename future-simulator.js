// Bitcoin1070 PRO v11.0 - AI未来資産シミュレーター
(() => {
  'use strict';
  const YEARS = [5, 10, 15, 20, 25, 30];
  const INFLATION = 0.02;
  const SETTINGS_KEY = 'bitcoin1070_future_v11_settings';
  let selectedYears = 5;
  let evaluations = [];
  let chart = null;

  const $ = id => document.getElementById(id);
  const yen = value => `¥${Math.round(Number(value) || 0).toLocaleString('ja-JP')}`;
  const pct = value => `${value >= 0 ? '+' : ''}${Number(value || 0).toFixed(1)}%`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  function profileFor(asset) {
    const symbol = String(asset.symbol || '').toUpperCase();
    const name = String(asset.name || '').toLowerCase();
    if (asset.type === 'crypto') {
      if (symbol === 'BTC' || name.includes('bitcoin') || name.includes('ビットコイン')) return {bear:-0.04, base:0.12, bull:0.22, risk:'中〜高', confidence:70, survival30:0.90, label:'大型暗号資産'};
      if (symbol === 'ETH' || name.includes('ethereum') || name.includes('イーサ')) return {bear:-0.07, base:0.10, bull:0.23, risk:'高', confidence:60, survival30:0.78, label:'基盤系暗号資産'};
      if (symbol === 'XRP') return {bear:-0.11, base:0.07, bull:0.24, risk:'非常に高い', confidence:46, survival30:0.55, label:'決済系暗号資産'};
      if (['SOL','SUI','RENDER','RNDR','TAO'].includes(symbol)) return {bear:-0.15, base:0.08, bull:0.29, risk:'非常に高い', confidence:40, survival30:0.42, label:'成長型暗号資産'};
      return {bear:-0.18, base:0.04, bull:0.26, risk:'極めて高い', confidence:30, survival30:0.25, label:'投機型暗号資産'};
    }
    if (asset.type === 'us') {
      const mega = ['NVDA','MSFT','AAPL','GOOGL','GOOG','AMZN','META','TSM','AVGO'].includes(symbol);
      return mega
        ? {bear:-0.01, base:0.075, bull:0.145, risk:'中', confidence:64, survival30:0.82, label:'米国大型成長株'}
        : {bear:-0.04, base:0.055, bull:0.13, risk:'高', confidence:48, survival30:0.60, label:'米国個別株'};
    }
    const growth = /半導体|ai|エーアイ|アドバンテスト|キオクシア|フジクラ|重工|vrain/i.test(`${name} ${symbol}`);
    return growth
      ? {bear:-0.04, base:0.065, bull:0.13, risk:'高', confidence:50, survival30:0.62, label:'日本成長株'}
      : {bear:-0.02, base:0.04, bull:0.09, risk:'中', confidence:55, survival30:0.68, label:'日本個別株'};
  }

  function settings() {
    return {
      monthly: Math.max(0, Number($('monthlyContribution')?.value) || 0),
      target: Math.max(1000000, Number($('targetAmount')?.value) || 100000000),
      real: Boolean($('realValueToggle')?.checked)
    };
  }

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings())); } catch (_) {}
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      if (Number.isFinite(Number(saved.monthly))) $('monthlyContribution').value = Math.max(0, Number(saved.monthly));
      if (Number.isFinite(Number(saved.target))) $('targetAmount').value = Math.max(1000000, Number(saved.target));
      $('realValueToggle').checked = Boolean(saved.real);
    } catch (_) {}
  }

  function adjustedRate(rate, years) {
    if (rate <= 0) return rate;
    const decay = Math.max(0.42, 1 - years * 0.014);
    return rate * decay;
  }

  function survivalFactor(asset, years, scenario) {
    const p = profileFor(asset);
    const baseSurvival = Math.pow(p.survival30, years / 30);
    if (scenario === 'bull') return 0.96 + 0.04 * baseSurvival;
    if (scenario === 'base') return 0.65 + 0.35 * baseSurvival;
    return baseSurvival;
  }

  function projectPrice(asset, years, scenario) {
    const p = profileFor(asset);
    const rate = adjustedRate(p[scenario], years);
    let projected = asset.currentPriceJpy * Math.pow(Math.max(0.01, 1 + rate), years) * survivalFactor(asset, years, scenario);
    if (settings().real) projected /= Math.pow(1 + INFLATION, years);
    return Math.max(0, projected);
  }

  function holdingsTotal(years, scenario) {
    return evaluations.reduce((sum, asset) => sum + projectPrice(asset, years, scenario) * asset.amount, 0);
  }

  function currentTotal() {
    return evaluations.reduce((sum, asset) => sum + asset.marketValueJpy, 0);
  }

  function impliedPortfolioRate(years, scenario) {
    const now = currentTotal();
    const projected = holdingsTotal(years, scenario);
    if (now <= 0 || projected <= 0 || years <= 0) return scenario === 'bear' ? -0.03 : scenario === 'base' ? 0.05 : 0.10;
    return Math.pow(projected / now, 1 / years) - 1;
  }

  function contributionFutureValue(years, scenario) {
    const monthly = settings().monthly;
    if (monthly <= 0) return 0;
    let annual = impliedPortfolioRate(years, scenario);
    if (settings().real) annual = (1 + annual) / (1 + INFLATION) - 1;
    const r = Math.pow(Math.max(0.01, 1 + annual), 1 / 12) - 1;
    const n = years * 12;
    if (Math.abs(r) < 0.000001) return monthly * n;
    return monthly * ((Math.pow(1 + r, n) - 1) / r);
  }

  function totalFor(years, scenario) {
    return holdingsTotal(years, scenario) + contributionFutureValue(years, scenario);
  }

  function confidenceFor(asset) {
    return clamp(Math.round(profileFor(asset).confidence - selectedYears * 1.25), 8, 90);
  }

  function renderYearButtons() {
    const box = $('yearButtons');
    box.innerHTML = YEARS.map(y => `<button type="button" data-years="${y}" class="${y === selectedYears ? 'active' : ''}">${y}年後</button>`).join('');
    box.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
      selectedYears = Number(btn.dataset.years);
      renderAll();
    }));
  }

  function renderSummary() {
    const now = currentTotal();
    const target = settings().target;
    ['bear','base','bull'].forEach(s => {
      const total = totalFor(selectedYears, s);
      const change = now > 0 ? (total / now - 1) * 100 : 0;
      $(`${s}Total`).textContent = yen(total);
      $(`${s}Change`).textContent = `現在比 ${pct(change)} ／ ${now > 0 ? (total / now).toFixed(2) : '0.00'}倍`;
      const reached = total >= target;
      $(`${s}Target`).textContent = reached ? `🎯 目標到達（+${yen(total-target)}）` : `目標まで ${yen(target-total)}`;
      $(`${s}Target`).className = reached ? 'target-reached' : 'target-short';
    });
    renderTargetScore();
  }

  function renderTargetScore() {
    const target = settings().target;
    const values = ['bear','base','bull'].map(s => totalFor(selectedYears, s));
    const ratios = values.map(v => clamp(v / target, 0, 1.25));
    const score = Math.round(clamp((ratios[0] * 0.2 + ratios[1] * 0.5 + ratios[2] * 0.3) * 100, 0, 100));
    $('targetScore').textContent = `${score} / 100`;
    $('targetMeterFill').style.width = `${score}%`;
    const reachedCount = values.filter(v => v >= target).length;
    $('targetExplanation').textContent = reachedCount === 3 ? `${selectedYears}年後、3シナリオすべてで目標超え。積立継続とリスク管理が重要です。`
      : reachedCount === 2 ? `${selectedYears}年後、標準・強気で目標到達。弱気局面への備えが必要です。`
      : reachedCount === 1 ? `${selectedYears}年後、強気時のみ目標到達。前提依存が大きい計画です。`
      : `${selectedYears}年後は3シナリオとも未達。積立額・期間・目標額の再調整余地があります。`;
  }

  function assetAdvice(asset, p, confidence) {
    if (asset.type === 'crypto' && p.risk.includes('非常')) return `上振れ余地は大きい一方、競争・規制・技術陳腐化で価値が大幅に失われる可能性があります。${selectedYears}年間の完全放置ではなく、半年〜1年ごとの生存確認が必要です。`;
    if (asset.type === 'crypto') return `暗号資産の中では相対的に生存性を高く見積もりますが、弱気ケースでは長期元本割れを明確に織り込んでいます。`;
    if (confidence < 35) return `予測期間が長く信頼度は低めです。価格目標より、売上・利益・競争優位・財務健全性の定期確認を優先してください。`;
    return `標準ケースは成熟に伴う成長鈍化を織り込んでいます。個別株は指数より企業固有リスクが大きいため、業績悪化時の見直し条件を決めておくべきです。`;
  }

  function renderAssets() {
    const list = $('futureAssetList');
    if (!evaluations.length) {
      list.innerHTML = '<div class="empty-state">価格を取得できる保有資産がありません。先に「保有資産を編集」から銘柄を追加してください。</div>';
      return;
    }
    list.innerHTML = evaluations.map(asset => {
      const p = profileFor(asset);
      const bear = projectPrice(asset, selectedYears, 'bear');
      const base = projectPrice(asset, selectedYears, 'base');
      const bull = projectPrice(asset, selectedYears, 'bull');
      const c = confidenceFor(asset);
      const trend = base > asset.currentPriceJpy * 1.5 ? '強気寄り' : base < asset.currentPriceJpy * 0.85 ? '弱気寄り' : '中立';
      const rates = `年率前提 弱気${pct(adjustedRate(p.bear,selectedYears)*100)}／標準${pct(adjustedRate(p.base,selectedYears)*100)}／強気${pct(adjustedRate(p.bull,selectedYears)*100)}`;
      return `<article class="future-asset-card">
        <div class="future-asset-head"><div><strong>${esc(asset.name)}</strong><span>${esc(asset.symbol)} ・ ${esc(p.label)}</span></div><span class="risk-pill">リスク ${esc(p.risk)}</span></div>
        <div class="future-current">現在価格 <strong>${yen(asset.currentPriceJpy)}</strong> ／ 保有評価 ${yen(asset.marketValueJpy)}</div>
        <div class="future-price-grid"><div class="bear"><span>弱気</span><strong>${yen(bear)}</strong><small>保有評価 ${yen(bear * asset.amount)}</small></div><div class="base"><span>標準</span><strong>${yen(base)}</strong><small>保有評価 ${yen(base * asset.amount)}</small></div><div class="bull"><span>強気</span><strong>${yen(bull)}</strong><small>保有評価 ${yen(bull * asset.amount)}</small></div></div>
        <div class="future-verdict"><strong>${selectedYears}年後評価：${trend}</strong><span>予測信頼度 ${c}%</span></div>
        <small class="future-rate-note">${rates}</small><p>${assetAdvice(asset, p, c)}</p>
      </article>`;
    }).join('');
  }

  function renderAdvice() {
    const now = currentTotal();
    if (!evaluations.length || now <= 0) {
      $('futureAdvice').innerHTML = '<p>保有資産を登録すると、ポートフォリオ全体の長期評価を表示します。</p>';
      return;
    }
    const cryptoValue = evaluations.filter(a => a.type === 'crypto').reduce((s,a)=>s+a.marketValueJpy,0);
    const cryptoShare = cryptoValue / now * 100;
    const sorted = [...evaluations].sort((a,b)=>b.marketValueJpy-a.marketValueJpy);
    const largest = sorted[0];
    const concentration = largest ? largest.marketValueJpy / now * 100 : 0;
    const top3 = sorted.slice(0,3).reduce((s,a)=>s+a.marketValueJpy,0) / now * 100;
    const bear = totalFor(selectedYears,'bear');
    const base = totalFor(selectedYears,'base');
    const bull = totalFor(selectedYears,'bull');
    const target = settings().target;
    const warnings = [];
    const positives = [];
    const actions = [];

    if (cryptoShare > 60) warnings.push(`暗号資産比率が${cryptoShare.toFixed(0)}%。長期の最大下振れが大きく、生活防衛資金とは分離すべき構成です。`);
    else if (cryptoShare > 35) warnings.push(`暗号資産比率が${cryptoShare.toFixed(0)}%。成長余地はある一方、値動きはかなり大きくなります。`);
    if (concentration > 40) warnings.push(`${largest.name}だけで${concentration.toFixed(0)}%。1銘柄の失敗が資産全体に直撃します。`);
    if (top3 > 75 && evaluations.length > 3) warnings.push(`上位3銘柄で${top3.toFixed(0)}%。銘柄数ほど実質分散できていません。`);
    if (bear < now * 0.65) warnings.push(`弱気ケースでは現在資産から${pct((bear/now-1)*100)}。下落耐性は低めです。`);

    if (evaluations.length >= 5) positives.push('複数銘柄を保有しており、単一銘柄集中よりは分散されています。');
    if (base > now * 2) positives.push(`標準ケースで約${(base/now).toFixed(1)}倍。時間を味方につける余地があります。`);
    if (settings().monthly > 0) positives.push(`毎月${yen(settings().monthly)}の積立を反映。価格予想より継続入金の寄与が安定要因です。`);

    if (base < target) actions.push(`目標まで標準ケースで${yen(target-base)}不足。積立額を上げるか、期間を延ばす方が無理な高リスク化より現実的です。`);
    if (cryptoShare > 50) actions.push('新規入金の一部を広範な株式指数や現金に回すと、弱気シナリオを改善しやすくなります。');
    if (concentration > 35) actions.push(`最大銘柄${largest.name}の上限比率を決め、超過分を分散するルールが有効です。`);
    if (!actions.length) actions.push('現状は極端な偏りが少なめです。年1回のリバランスと保有理由の更新を優先してください。');

    const verdict = bear < now * 0.65 ? '上振れ型・守りは弱い' : base >= target ? '目標射程内' : bull >= target ? '強気前提なら射程内' : '積立と期間の改善が必要';
    $('futureAdvice').innerHTML = `<div class="future-ai-verdict"><span>総合判定</span><strong>${esc(verdict)}</strong><p>弱気 ${yen(bear)} ／ 標準 ${yen(base)} ／ 強気 ${yen(bull)}</p></div>
      <div class="future-advice-columns"><div><h3>⚠️ 忖度なしの弱点</h3>${(warnings.length?warnings:['現時点で極端な集中・下振れは検出されませんでした。']).map(x=>`<p>・${esc(x)}</p>`).join('')}</div><div><h3>🚀 伸びる条件</h3>${(positives.length?positives:['保有企業・プロジェクトが競争優位を維持し、利益や利用者を長期的に伸ばすことが必要です。']).map(x=>`<p>・${esc(x)}</p>`).join('')}</div></div>
      <div class="future-action-box"><h3>🛠 改善アクション</h3>${actions.map(x=>`<p>・${esc(x)}</p>`).join('')}</div>
      <p class="technical-disclaimer">この分析は端末内のルールベース評価です。将来価格の保証や個別の売買推奨ではありません。</p>`;
  }

  function renderChart() {
    const canvas = $('futureChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const labels = ['現在', ...YEARS.map(y=>`${y}年後`)];
    const now = currentTotal();
    const datasets = [
      {label:'弱気', data:[now,...YEARS.map(y=>totalFor(y,'bear'))], borderColor:'#ef5350', backgroundColor:'rgba(239,83,80,.08)', tension:.25},
      {label:'標準', data:[now,...YEARS.map(y=>totalFor(y,'base'))], borderColor:'#f5a623', backgroundColor:'rgba(245,166,35,.08)', tension:.25},
      {label:'強気', data:[now,...YEARS.map(y=>totalFor(y,'bull'))], borderColor:'#26a69a', backgroundColor:'rgba(38,166,154,.08)', tension:.25}
    ];
    if (chart) chart.destroy();
    chart = new Chart(canvas, {type:'line', data:{labels,datasets}, options:{responsive:true, maintainAspectRatio:false, interaction:{mode:'index',intersect:false}, plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${yen(ctx.raw)}`}}}, scales:{y:{beginAtZero:true,ticks:{callback:v=>v>=100000000?`${(v/100000000).toFixed(1)}億`:v>=10000?`${Math.round(v/10000)}万`:yen(v)}}}}});
  }

  function renderAll() {
    saveSettings();
    renderYearButtons();
    renderSummary();
    renderAssets();
    renderAdvice();
    renderChart();
  }

  async function init() {
    try {
      loadSettings();
      if (typeof fetchCryptoPrices === 'function') {
        try { const fetched = await fetchCryptoPrices(); if (fetched) latestCryptoPrices = fetched; } catch (e) { console.warn('価格更新失敗、保存済み価格を使用:', e); }
      }
      evaluations = typeof evaluateAssets === 'function' ? evaluateAssets().filter(a => a.amount > 0 && a.currentPriceJpy > 0) : [];
      $('futureStatus').textContent = evaluations.length ? `${evaluations.length}銘柄を取得済み価格から計算しています。` : '価格取得済みの保有銘柄がありません。';
      renderAll();
    } catch (error) {
      console.error(error);
      $('futureStatus').textContent = '読み込みに失敗しました。通信状態と保有銘柄設定を確認してください。';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    ['realValueToggle','monthlyContribution','targetAmount'].forEach(id => $(id)?.addEventListener(id === 'realValueToggle' ? 'change' : 'input', renderAll));
    $('recalculateFuture')?.addEventListener('click', init);
    init();
  });
})();
