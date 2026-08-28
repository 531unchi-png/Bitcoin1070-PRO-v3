// Bitcoin1070 PRO v14.2 - Home Decision Center UI
(() => {
  'use strict';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(){
    const root=document.getElementById('dailyDecisionCenter'); const api=window.Bitcoin1070DecisionCenter; if(!root||!api)return;
    const snap=api.snapshot();
    const sig=snap.signals.slice(0,8).map(x=>`<div class="decision-signal ${x.signal.level}"><span>${esc(x.asset.symbol)}</span><strong>${esc(x.signal.label)}</strong><small>${esc(x.signal.reasons[0])}</small></div>`).join('');
    const ops=snap.strategies.map(x=>`<div class="decision-action"><span>${x.icon}</span><div><strong>${esc(x.title)}</strong><small>${esc(x.text)}</small></div></div>`).join('');
    const h=snap.health;
    root.innerHTML=`<div class="decision-head"><div><span class="eyebrow">DAILY DECISION</span><h2>🎯 今日の判断</h2></div><span class="health-pill">健康度 ${h.score===null?'--':h.score}/100</span></div><div class="decision-signals">${sig||'<p class="small">保有銘柄を登録するとシグナルを表示します。</p>'}</div><div class="decision-actions"><h3>🧠 今日の作戦</h3>${ops}</div><a class="inline-card-link" href="portfolio.html#decision-tools">利確・損切り・健康診断・アラート設定 →</a><p class="technical-disclaimer">シグナルは公開データと登録資産から機械的に算出する参考情報です。将来の利益を保証するものではありません。</p>`;
  }
  document.addEventListener('DOMContentLoaded',()=>{ render(); setTimeout(render,1200); setTimeout(render,3500); });
  window.addEventListener('bitcoin1070:prices-updated',render);
  window.addEventListener('bitcoin1070:daily-changes-updated',render);
})();
