// Bitcoin1070 PRO v16.0 - Cross Asset Opportunity Radar
(()=>{
'use strict';
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const num=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
function classify(score,heat){
 if(heat>=75)return {key:'hot',label:'⚠️ 追い買い注意'};
 if(score>=82)return {key:'crash',label:'🔥 暴落買い候補'};
 if(score>=68)return {key:'strong-dip',label:'🟠 強い押し目'};
 if(score>=54)return {key:'dip',label:'🟡 押し目'};
 return {key:'normal',label:'⚪ 通常'};
}
function evaluate(asset){
 const data=window.Bitcoin1070DataLayer,pro=window.Bitcoin1070ProfessionalAI;
 if(!data||!pro)return null;
 const snap=data.snapshot(asset),t=snap.technical||{},base=pro.crashRadar(asset)||{};
 const change=num(snap.change.percent),rsi=num(t.rsi),tech=num(t.score),volume=num(t.volume?.ratio),bb=num(t.bollinger?.position);
 let score=num(base.score)??35;
 const reasons=[];
 if(change!==null){if(change<=-10){score+=18;reasons.push(`${snap.change.label} ${change.toFixed(1)}%`)}else if(change<=-5){score+=10;reasons.push('大幅下落')}else if(change<=-2){score+=5;reasons.push('短期下落')}}
 if(rsi!==null){if(rsi<=25){score+=16;reasons.push(`RSI ${rsi.toFixed(0)} 売られ過ぎ`)}else if(rsi<=35){score+=9;reasons.push(`RSI ${rsi.toFixed(0)}`)}}
 if(volume!==null&&volume>=1.8){score+=8;reasons.push(`出来高 ${volume.toFixed(1)}倍`)}
 // technical.js exposes Bollinger position as 0-100, not 0-1.
 if(bb!==null&&bb<=12){score+=7;reasons.push('BB下限付近')}
 if(tech!==null&&tech<=35){score+=5;reasons.push('テクニカル弱含み')}
 if(asset.type==='crypto'&&String(asset.symbol).toUpperCase()==='BTC'){
   const btc=window.Bitcoin1070BTCIntelligence?.evaluate?.();
   if(btc?.cycle?.stage==='底候補ゾーン'){score+=12;reasons.push('1070日 底候補ゾーン')}
 }
 score=Math.round(clamp(score));
 let heat=0;
 if(change!==null&&change>=6)heat+=28;
 if(rsi!==null&&rsi>=70)heat+=32;
 if(bb!==null&&bb>=88)heat+=22;
 if(tech!==null&&tech>=78)heat+=18;
 heat=Math.round(clamp(heat));
 const state=classify(score,heat);
 return {asset,score,heat,state,reasons:reasons.slice(0,4),quality:snap.quality.score,change,changeLabel:snap.change.label,updatedAt:Date.now()};
}
function scan(){
 const center=window.Bitcoin1070DecisionCenter;
 const assets=center?.holdings?.()||[];
 const rows=assets.map(evaluate).filter(Boolean).sort((a,b)=>b.score-a.score);
 return {rows,opportunities:rows.filter(r=>['crash','strong-dip','dip'].includes(r.state.key)),overheated:rows.filter(r=>r.state.key==='hot'),generatedAt:Date.now(),note:'買い場スコアは価格下落・テクニカル・サイクル等を合成した相対指標で、上昇確率ではありません。'};
}
window.Bitcoin1070OpportunityRadar={evaluate,scan,version:'16.0'};
window.dispatchEvent(new CustomEvent('bitcoin1070:opportunity-radar-ready'));
})();
