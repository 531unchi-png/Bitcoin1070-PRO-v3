// Bitcoin1070 PRO v16.0 - BTC 1070 Intelligence
(()=>{
'use strict';
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
function evaluate(){
 const cycle=window.Bitcoin1070Cycle?.snapshot?.();
 const data=window.Bitcoin1070DataLayer;
 const pro=window.Bitcoin1070ProfessionalAI;
 const center=window.Bitcoin1070DecisionCenter;
 if(!cycle||!data||!pro||!center)return null;
 const btc=(center.holdings?.()||[]).find(a=>a.type==='crypto'&&String(a.symbol).toUpperCase()==='BTC')||{type:'crypto',symbol:'BTC'};
 const snap=data.snapshot(btc),factor=pro.factorScore(btc),opportunity=pro.crashRadar(btc),technical=snap.technical;
 const price=num(snap.price.value),change=num(snap.change.percent);
 let cycleScore=50;
 if(cycle.stage==='底候補ゾーン')cycleScore=82;
 else if(cycle.stage==='次サイクル上昇期')cycleScore=72;
 else if(cycle.stage==='次回ピーク候補')cycleScore=30;
 else if(cycle.stage==='下落・底探し')cycleScore=40;
 else if(cycle.stage==='天井形成候補')cycleScore=35;
 const halvingDays=num(cycle.halvingRemainingDays);
 let halvingScore=50;
 if(halvingDays!==null){if(halvingDays>=180&&halvingDays<=900)halvingScore=68;else if(halvingDays>=0&&halvingDays<180)halvingScore=60;else if(halvingDays<0&&halvingDays>=-540)halvingScore=70;}
 const techScore=num(technical?.score)??50;
 const momentumScore=change===null?50:clamp(50+change*5);
 const quality=snap.quality.score;
 const score=Math.round(cycleScore*.34+halvingScore*.16+techScore*.30+momentumScore*.20);
 const confidence=Math.round(clamp(quality*.55+(factor?.confidence?.score||0)*.45));
 const label=score>=70?'強気':score<=38?'弱気':'中立';
 const reasons=[`1070日局面: ${cycle.stage}`,`半減期まで ${halvingDays!==null?halvingDays+'日':'--'}`,`テクニカル ${Math.round(techScore)}/100`,`${snap.change.label} ${change===null?'--':(change>=0?'+':'')+change.toFixed(2)+'%'}`];
 return {asset:btc,price,score,label,confidence,quality,cycleScore,halvingScore,technicalScore:techScore,momentumScore,opportunity,cycle,reasons,updatedAt:Date.now(),note:'1070日モデルは歴史的パターンを使う仮説であり、将来価格を保証しません。'};
}
window.Bitcoin1070BTCIntelligence={evaluate,version:'16.0'};
window.dispatchEvent(new CustomEvent('bitcoin1070:btc-intelligence-ready'));
})();
