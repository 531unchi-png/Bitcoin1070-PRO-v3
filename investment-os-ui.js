// Bitcoin1070 PRO v16.0 - AI Commander UI
(()=>{
'use strict';
const yen=v=>Number.isFinite(Number(v))?'¥'+Math.round(Number(v)).toLocaleString('ja-JP'):'--';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
 const root=document.getElementById('investmentOSCommander');
 const api=window.Bitcoin1070InvestmentOS;
 if(!root||!api)return;
 const c=api.commander();
 if(!c){root.innerHTML='<div class="loading-state">AI司令塔の判断材料を取得中...</div>';return;}
 const actions=c.actions||[];
 root.innerHTML=`<div class="ios-head"><div><span class="eyebrow">INVESTMENT OS</span><h2>🧠 AI司令塔</h2></div><div class="ios-quality"><small>データ品質</small><strong>${c.dataQuality}/100</strong></div></div>
 <p class="ios-lead">今日優先して確認する判断を最大3件に絞ります。</p>
 <div class="ios-actions">${actions.map((r,i)=>`<article class="ios-action"><div class="ios-rank">${i+1}</div><div class="ios-action-main"><div class="ios-action-title"><strong>${esc(r.asset.symbol)}</strong><span>${esc(r.action)}</span></div><div class="ios-scores"><span>総合 <b>${r.factor.score}/100</b></span><span>買い場 <b>${r.opportunity.score}/100</b></span><span>信頼度 <b>${r.confidence}/100</b></span></div><div class="ios-levels"><span>買い候補 ${yen(r.plan?.buyZone)}</span><span>利確候補 ${yen(r.plan?.takeProfit1)}</span><span>損切り候補 ${yen(r.plan?.stopLoss)}</span></div><details><summary>判断根拠・データ品質</summary><div class="ios-reasons">${(r.factor.factors||[]).slice(0,6).map(f=>`<span>${esc(f.name)} ${Math.round(f.score)}/100</span>`).join('')}</div><div class="ios-checks">${r.quality.checks.map(x=>`<span>${x.status==='live'?'✓':x.status==='stale'?'△':'×'} ${esc(x.name)}</span>`).join('')}</div>${r.plan?.invalidation?.length?`<p><b>判断を撤回する条件:</b> ${r.plan.invalidation.map(esc).join(' / ')}</p>`:''}</details></div></article>`).join('')}</div>
 ${c.risk?`<div class="ios-risk"><span>🛡️ ポートフォリオ耐久度</span><strong>${c.risk.score}/100・${esc(c.risk.label)}</strong><small>想定下落幅の参考値 ${c.risk.estimatedDownsidePct}%</small></div>`:''}
 <small class="ios-disclaimer">${esc(c.disclaimer)}</small>`;
}
['bitcoin1070:investment-os-ready','bitcoin1070:data-layer-updated','bitcoin1070:daily-changes-updated','bitcoin1070:professional-ai-updated','b1070:market-updated'].forEach(e=>window.addEventListener(e,()=>setTimeout(render,30)));
document.addEventListener('DOMContentLoaded',()=>{render();setTimeout(render,1200);setTimeout(render,3500)});
window.Bitcoin1070InvestmentOSUI={render,version:'16.0'};
})();
