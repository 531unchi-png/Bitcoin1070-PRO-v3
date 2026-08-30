// Bitcoin1070 PRO v15.0 - Professional multi-factor decision engine
(() => {
'use strict';
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
const center=()=>window.Bitcoin1070DecisionCenter;
const daily=()=>{for(const k of ['bitcoin1070_daily_changes_v14_0','bitcoin1070_daily_changes_v13_1']){try{const x=JSON.parse(localStorage.getItem(k)||'null');if(x?.values)return x.values}catch(_){}}return{}};
const confidence=(coverage,agreement)=>{const score=clamp(Math.round(coverage*70+agreement*30));return{score,label:score>=80?'高':score>=60?'中':'低'}};
function factorScore(asset){const api=center();if(!api)return null;const row=daily()[api.keyOf(asset)]||{};const ch=num(row.percent);const factors=[];
 if(ch!==null){factors.push({name:asset.type==='crypto'?'24hモメンタム':'前日モメンタム',score:clamp(50+ch*7),weight:.34,value:ch});}
 const p=api.priceOf(asset),cost=num(asset.averagePrice??asset.avgPrice??asset.costPrice??asset.purchasePrice);
 if(p!==null&&cost!==null&&cost>0){const ret=(p/cost-1)*100;factors.push({name:'取得価格乖離',score:clamp(50+ret*.65),weight:.18,value:ret});}
 const h=api.health();if(h?.score!==null)factors.push({name:'ポートフォリオ健全性',score:h.score,weight:.18,value:h.score});
 let cycle=null;try{cycle=window.Bitcoin1070Cycle?.getSnapshot?.()||window.Bitcoin1070Cycle?.snapshot?.()}catch(_){}
 if(asset.type==='crypto'&&String(asset.symbol).toUpperCase()==='BTC'&&cycle){const raw=num(cycle.score??cycle.progress);if(raw!==null)factors.push({name:'1070日サイクル',score:clamp(raw),weight:.30,value:raw});}
 const used=factors.reduce((s,f)=>s+f.weight,0);if(!used)return{score:50,confidence:{score:20,label:'低'},factors:[],label:'データ不足'};
 const score=clamp(Math.round(factors.reduce((s,f)=>s+f.score*f.weight,0)/used));const agreement=1-(Math.max(...factors.map(f=>f.score))-Math.min(...factors.map(f=>f.score)))/100;const conf=confidence(Math.min(1,used),clamp(agreement,0,1));
 return{score,confidence:conf,factors,label:score>=70?'強気':score<=35?'弱気':'中立'};
}
function crashRadar(asset){const api=center();const row=daily()[api.keyOf(asset)]||{};const ch=num(row.percent);const base=factorScore(asset);let opportunity=50;const reasons=[];if(ch!==null){if(ch<=-8){opportunity+=28;reasons.push('急落率が大きい')}else if(ch<=-5){opportunity+=20;reasons.push('強い下落')}else if(ch<=-3){opportunity+=10;reasons.push('押し目候補')}else if(ch>5){opportunity-=15;reasons.push('短期過熱に注意')}}if(base){opportunity+=(50-base.score)*.2;}opportunity=clamp(Math.round(opportunity));return{score:opportunity,label:opportunity>=78?'暴落買い候補':opportunity>=65?'強い押し目':opportunity>=55?'押し目監視':'通常',reasons,confidence:base?.confidence||{score:20,label:'低'}};}
function anomaly(asset){const api=center();const ch=num(daily()[api.keyOf(asset)]?.percent);if(ch===null)return{level:'unknown',score:0,label:'データ不足'};const magnitude=Math.abs(ch);const score=clamp(Math.round(magnitude*12));return{score,level:score>=80?'high':score>=55?'medium':'normal',label:score>=80?'異常変動':score>=55?'要監視':'通常範囲',reason:`${asset.type==='crypto'?'24時間':'前日'}変動 ${ch>=0?'+':''}${ch.toFixed(2)}%`};}
function commander(){const api=center();if(!api)return null;const rows=api.holdings().map(asset=>({asset,model:factorScore(asset),crash:crashRadar(asset),anomaly:anomaly(asset)}));const urgent=rows.filter(x=>x.anomaly.level==='high');const opportunities=rows.filter(x=>x.crash.score>=65).sort((a,b)=>b.crash.score-a.crash.score);const weak=rows.filter(x=>x.model?.score<=35);const actions=[];if(urgent.length)actions.push({priority:1,title:'異常値動きを確認',text:urgent.slice(0,3).map(x=>x.asset.symbol).join('・')+' は通常より大きい変動'});if(opportunities.length)actions.push({priority:2,title:'押し目候補を精査',text:`${opportunities[0].asset.symbol} 買い場スコア ${opportunities[0].crash.score}/100。分割前提で確認`});if(weak.length)actions.push({priority:3,title:'弱気銘柄を点検',text:weak.slice(0,3).map(x=>x.asset.symbol).join('・')+' のリスク要因を確認'});if(!actions.length)actions.push({priority:5,title:'無理に売買しない',text:'複数要因で緊急性の高いシグナルはありません'});return{rows,actions:actions.sort((a,b)=>a.priority-b.priority).slice(0,3),health:api.health()};}
function simulateCapital(amount){const c=commander();const cash=Math.max(0,num(amount)||0);if(!c)return[];const eligible=c.rows.filter(x=>x.model&&x.model.confidence.score>=50).sort((a,b)=>(b.model.score+b.crash.score)-(a.model.score+a.crash.score)).slice(0,3);const total=eligible.reduce((s,x)=>s+Math.max(1,x.model.score+x.crash.score-80),0)||1;return eligible.map(x=>{const w=Math.max(1,x.model.score+x.crash.score-80)/total;return{symbol:x.asset.symbol,allocation:Math.round(cash*w),weight:w,score:x.model.score,opportunity:x.crash.score,confidence:x.model.confidence};});}
window.Bitcoin1070ProfessionalAI={factorScore,crashRadar,anomaly,commander,simulateCapital,version:'15.0'};
window.dispatchEvent(new CustomEvent('bitcoin1070:professional-ai-ready'));
})();
