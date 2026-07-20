// Bitcoin1070 PRO v10.3 - 30年未来シミュレーター
(() => {
  const YEARS = [5, 10, 15, 20, 25, 30];
  const INFLATION = 0.02;
  let selectedYears = 5;
  let evaluations = [];
  let chart = null;

  const yen = value => `¥${Math.round(Number(value) || 0).toLocaleString('ja-JP')}`;
  const pct = value => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function profileFor(asset) {
    const symbol = String(asset.symbol || '').toUpperCase();
    const name = String(asset.name || '').toLowerCase();
    if (asset.type === 'crypto') {
      if (symbol === 'BTC' || name.includes('bitcoin') || name.includes('ビットコイン')) return {bear:-0.03, base:0.13, bull:0.24, risk:'中', confidence:68, label:'大型暗号資産'};
      if (symbol === 'ETH' || name.includes('ethereum') || name.includes('イーサ')) return {bear:-0.06, base:0.11, bull:0.25, risk:'高', confidence:58, label:'基盤系暗号資産'};
      if (['SOL','SUI','RENDER','RNDR','TAO','XRP'].includes(symbol)) return {bear:-0.12, base:0.09, bull:0.30, risk:'非常に高い', confidence:42, label:'成長型暗号資産'};
      return {bear:-0.16, base:0.05, bull:0.28, risk:'極めて高い', confidence:32, label:'投機型暗号資産'};
    }
    if (asset.type === 'us') {
      const mega = ['NVDA','MSFT','AAPL','GOOGL','GOOG','AMZN','META','TSM','AVGO'].includes(symbol);
      return mega
        ? {bear:0.00, base:0.08, bull:0.15, risk:'中', confidence:62, label:'米国大型成長株'}
        : {bear:-0.03, base:0.06, bull:0.14, risk:'高', confidence:48, label:'米国個別株'};
    }
    const growth = /半導体|ai|エーアイ|アドバンテスト|キオクシア|フジクラ|重工|vrain/i.test(name);
    return growth
      ? {bear:-0.03, base:0.07, bull:0.14, risk:'高', confidence:49, label:'日本成長株'}
      : {bear:-0.01, base:0.045, bull:0.10, risk:'中', confidence:54, label:'日本個別株'};
  }

  function adjustedRate(rate, years) {
    if (rate < 0) return rate;
    const decay = Math.max(0.50, 1 - years * 0.012);
    return rate * decay;
  }

  function projectPrice(asset, years, scenario) {
    const profile = profileFor(asset);
    const rate = adjustedRate(profile[scenario], years);
    let projected = asset.currentPriceJpy * Math.pow(1 + rate, years);
    if (asset.type === 'crypto' && scenario === 'bear' && !['BTC','ETH'].includes(String(asset.symbol).toUpperCase())) {
      projected *= years >= 20 ? 0.35 : years >= 10 ? 0.55 : 0.75;
    }
    if (document.getElementById('realValueToggle')?.checked) projected /= Math.pow(1 + INFLATION, years);
    return Math.max(0, projected);
  }

  function totalFor(years, scenario) {
    return evaluations.reduce((sum, asset) => sum + projectPrice(asset, years, scenario) * asset.amount, 0);
  }

  function currentTotal() {
    return evaluations.reduce((sum, asset) => sum + asset.marketValueJpy, 0);
  }

  function confidenceFor(asset) {
    const base = profileFor(asset).confidence;
    return Math.max(10, Math.round(base - selectedYears * 1.3));
  }

  function renderYearButtons() {
    const box = document.getElementById('yearButtons');
    box.innerHTML = YEARS.map(y => `<button type="button" data-years="${y}" class="${y === selectedYears ? 'active' : ''}">${y}年後</button>`).join('');
    box.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
      selectedYears = Number(btn.dataset.years);
      renderAll();
    }));
  }

  function renderSummary() {
    const now = currentTotal();
    ['bear','base','bull'].forEach(s => {
      const total = totalFor(selectedYears, s);
      const change = now > 0 ? (total / now - 1) * 100 : 0;
      document.getElementById(`${s}Total`).textContent = yen(total);
      document.getElementById(`${s}Change`).textContent = `現在比 ${pct(change)} ／ ${now > 0 ? (total / now).toFixed(2) : '0.00'}倍`;
    });
  }

  function renderAssets() {
    const list = document.getElementById('futureAssetList');
    if (!evaluations.length) {
      list.innerHTML = '<div class="empty-state">保有資産がありません。先に「保有資産を編集」から銘柄を追加してください。</div>';
      return;
    }
    list.innerHTML = evaluations.map(asset => {
      const p = profileFor(asset);
      const bear = projectPrice(asset, selectedYears, 'bear');
      const base = projectPrice(asset, selectedYears, 'base');
      const bull = projectPrice(asset, selectedYears, 'bull');
      const c = confidenceFor(asset);
      const baseTotal = base * asset.amount;
      const trend = base > asset.currentPriceJpy * 1.5 ? '強気寄り' : base < asset.currentPriceJpy * 0.85 ? '弱気寄り' : '中立';
      return `<article class="future-asset-card">
        <div class="future-asset-head"><div><strong>${esc(asset.name)}</strong><span>${esc(asset.symbol)} ・ ${esc(p.label)}</span></div><span class="risk-pill">リスク ${p.risk}</span></div>
        <div class="future-current">現在価格 <strong>${yen(asset.currentPriceJpy)}</strong> ／ 保有評価 ${yen(asset.marketValueJpy)}</div>
        <div class="future-price-grid"><div class="bear"><span>弱気</span><strong>${yen(bear)}</strong><small>保有評価 ${yen(bear * asset.amount)}</small></div><div class="base"><span>標準</span><strong>${yen(base)}</strong><small>保有評価 ${yen(baseTotal)}</small></div><div class="bull"><span>強気</span><strong>${yen(bull)}</strong><small>保有評価 ${yen(bull * asset.amount)}</small></div></div>
        <div class="future-verdict"><strong>${selectedYears}年後評価：${trend}</strong><span>予測信頼度 ${c}%</span></div>
        <p>${assetAdvice(asset, p, c)}</p>
      </article>`;
    }).join('');
  }

  function assetAdvice(asset, p, confidence) {
    if (asset.type === 'crypto' && p.risk.includes('高')) return `上振れ余地は大きい一方、長期では競争・規制・技術陳腐化により価値が大幅に失われる可能性があります。${selectedYears}年間の放置前提ではなく、定期的な生存確認が必要です。`;
    if (asset.type === 'crypto') return `暗号資産の中では相対的に生存確率を高く見積もりますが、価格変動は株式より大きく、弱気ケースでは元本割れを想定しています。`;
    if (confidence < 35) return `期間が長く不確実性が非常に高いため、数値よりも事業の継続性・競争優位・財務健全性を毎年確認することが重要です。`;
    return `標準ケースは市場平均に近い成長を想定しています。個別企業なので、業績悪化や競争力低下があれば指数投資より下振れしやすい点に注意してください。`;
  }

  function renderAdvice() {
    const now = currentTotal();
    if (!evaluations.length || now <= 0) {
      document.getElementById('futureAdvice').innerHTML = '<p>保有資産を登録すると、ポートフォリオ全体の長期評価を表示します。</p>';
      return;
    }
    const cryptoShare = evaluations.filter(a => a.type === 'crypto').reduce((s,a)=>s+a.marketValueJpy,0) / now * 100;
    const largest = [...evaluations].sort((a,b)=>b.marketValueJpy-a.marketValueJpy)[0];
    const concentration = largest ? largest.marketValueJpy / now * 100 : 0;
    const bear = totalFor(selectedYears,'bear');
    const bull = totalFor(selectedYears,'bull');
    const warnings = [];
    const positives = [];
    if (cryptoShare > 50) warnings.push(`暗号資産比率が${cryptoShare.toFixed(0)}%で、長期の値動きが非常に大きくなりやすい構成です。`);
    if (concentration > 35) warnings.push(`${largest.name}だけで${concentration.toFixed(0)}%を占めています。1銘柄の失敗が資産全体に直撃します。`);
    if (evaluations.length >= 5) positives.push('複数銘柄を保有しており、単一銘柄のみよりは分散されています。');
    if (bull / now >= 5) positives.push(`強気ケースでは${selectedYears}年後に約${(bull/now).toFixed(1)}倍の余地があります。`);
    const verdict = bear < now * 0.7 ? '守りの弱さが目立つ' : bull > now * 3 ? '上振れ余地は大きい' : 'バランス型';
    document.getElementById('futureAdvice').innerHTML = `<div class="future-ai-verdict"><span>総合判定</span><strong>${verdict}</strong><p>弱気 ${yen(bear)} ／ 強気 ${yen(bull)}</p></div><div class="future-advice-columns"><div><h3>⚠️ 忖度なしの弱点</h3>${(warnings.length?warnings:['現時点で極端な集中は検出されませんでした。']).map(x=>`<p>・${esc(x)}</p>`).join('')}</div><div><h3>🚀 伸びる条件</h3>${(positives.length?positives:['保有企業・プロジェクトが競争優位を維持し、利益や利用者を長期的に伸ばすことが必要です。']).map(x=>`<p>・${esc(x)}</p>`).join('')}</div></div><p class="technical-disclaimer">長期予測は不確実です。数値は売買推奨ではなく、資産配分とリスクを考えるためのシナリオです。</p>`;
  }

  function renderChart() {
    const canvas = document.getElementById('futureChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const labels = ['現在', ...YEARS.map(y=>`${y}年後`)];
    const now = currentTotal();
    const datasets = [
      {label:'弱気', data:[now,...YEARS.map(y=>totalFor(y,'bear'))]},
      {label:'標準', data:[now,...YEARS.map(y=>totalFor(y,'base'))]},
      {label:'強気', data:[now,...YEARS.map(y=>totalFor(y,'bull'))]}
    ];
    if (chart) chart.destroy();
    chart = new Chart(canvas, {type:'line', data:{labels,datasets}, options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${yen(ctx.raw)}`}}}, scales:{y:{ticks:{callback:v=>yen(v)}}}}});
  }

  function renderAll() {
    renderYearButtons(); renderSummary(); renderAssets(); renderAdvice(); renderChart();
  }

  async function init() {
    try {
      if (typeof fetchCryptoPrices === 'function') {
        try { const fetched = await fetchCryptoPrices(); if (fetched) latestCryptoPrices = fetched; } catch (_) {}
      }
      evaluations = typeof evaluateAssets === 'function' ? evaluateAssets().filter(a => a.amount > 0 && a.currentPriceJpy > 0) : [];
      document.getElementById('futureStatus').textContent = evaluations.length ? `${evaluations.length}銘柄を最新評価額から計算しています。` : '価格取得済みの保有銘柄がありません。';
      renderAll();
    } catch (error) {
      console.error(error);
      document.getElementById('futureStatus').textContent = '読み込みに失敗しました。通信状態と保有銘柄設定を確認してください。';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('realValueToggle')?.addEventListener('change', renderAll);
    document.getElementById('recalculateFuture')?.addEventListener('click', init);
    init();
  });
})();
