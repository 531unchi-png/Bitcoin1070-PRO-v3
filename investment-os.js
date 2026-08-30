// Bitcoin1070 PRO v16.2 - Unified Investment OS decision engine
(()=>{
  'use strict';
  const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
  const n=v=>Number.isFinite(Number(v))?Number(v):null;

  function evidence(asset,factor,quality){
    const t=factor?.technical||window.Bitcoin1070ProfessionalAI?.getTechnical?.(asset)||null;
    const rsi=n(t?.rsi),macd=n(t?.macd?.histogram),ma25=n(t?.ma25),ma75=n(t?.ma75),price=n(t?.currentPrice),volume=n(t?.volume?.ratio),rr=n(t?.tradeLevels?.riskReward);
    const checks=[];
    if(rsi!==null) checks.push({name:'RSI',ok:rsi>=35&&rsi<=70,value:rsi});
    if(macd!==null) checks.push({name:'MACD',ok:macd>=0,value:macd});
    if(ma25!==null&&ma75!==null) checks.push({name:'移動平均',ok:ma25>=ma75,value:ma25-ma75});
    if(price!==null&&ma25!==null) checks.push({name:'25日線',ok:price>=ma25,value:price-ma25});
    if(volume!==null) checks.push({name:'出来高',ok:volume>=.8,value:volume});
    if(rr!==null) checks.push({name:'RR',ok:rr>=1.5,value:rr});
    const available=checks.length,positive=checks.filter(x=>x.ok).length,ratio=available?positive/available:0;
    const technicalLive=!(quality?.missing||[]).includes('テクニカル')&&t;
    return{technicalLive:!!technicalLive,available,positive,ratio,checks,strongReady:!!technicalLive&&available>=3&&ratio>=.60,weakReady:!!technicalLive&&available>=3&&ratio<=.40};
  }

  function model(asset){
    const pro=window.Bitcoin1070ProfessionalAI;
    const data=window.Bitcoin1070DataLayer;
    if(!pro||!data) return null;
    const factor=pro.factorScore(asset),opportunity=pro.crashRadar(asset),anomaly=pro.anomaly(asset),plan=pro.tradePlan(asset),quality=data.quality(asset);
    if(!factor) return null;
    const ev=evidence(asset,factor,quality);
    let confidence=Math.round(clamp((factor.confidence?.score||0)*.55+quality.score*.30+(ev.available?ev.ratio*100:40)*.15));
    if(!ev.technicalLive) confidence=Math.min(confidence,54);
    const missing=(quality.missing||[]).filter(Boolean),stale=(quality.stale||[]).filter(Boolean);
    const provisional=confidence<55||!ev.technicalLive;
    let action='様子見';
    if(provisional) action='暫定評価';
    else if(anomaly?.level==='high') action='異常値動きを確認';
    else if(opportunity?.score>=78&&factor.score>=48&&ev.strongReady) action='買い場を精査';
    else if(factor.score>=72&&ev.strongReady) action='強気継続を監視';
    else if(factor.score<=34&&ev.weakReady) action='縮小・撤退条件を確認';
    else if(factor.score>=72&&!ev.strongReady) action='強気候補・確認待ち';
    else if(factor.score<=34&&!ev.weakReady) action='弱気候補・確認待ち';
    const statusDetail=provisional
      ? (missing.length?`不足: ${missing.join(' / ')}`:stale.length?`更新待ち: ${stale.join(' / ')}`:'テクニカル確認が不足しているため暫定評価')
      : `主要データ取得済み・テクニカル根拠 ${ev.positive}/${ev.available}`;
    return {asset,factor,opportunity,anomaly,plan,quality,confidence,action,provisional,missing,stale,statusDetail,evidence:ev};
  }

  function priority(row){if(!row)return 0;let score=0;if(row.anomaly?.level==='high')score+=100;if(row.factor?.score<=34&&row.confidence>=55&&row.evidence?.weakReady)score+=75;if(row.opportunity?.score>=78&&row.confidence>=55&&row.evidence?.strongReady)score+=70;if(row.opportunity?.score>=65&&row.confidence>=55&&row.evidence?.strongReady)score+=45;score+=Math.abs((row.factor?.score||50)-50)*.35;score+=row.confidence*.1;return score;}

  function commander(){const center=window.Bitcoin1070DecisionCenter;if(!center)return null;const rows=(center.holdings?.()||[]).map(model).filter(Boolean),ranked=[...rows].sort((a,b)=>priority(b)-priority(a)),actions=ranked.filter(row=>row.action!=='様子見').slice(0,3),selected=actions.length?actions:ranked.slice(0,1),risk=window.Bitcoin1070ProfessionalAI?.riskBudget?.()||null,avgQuality=rows.length?Math.round(rows.reduce((s,r)=>s+r.quality.score,0)/rows.length):0;return{rows,actions:selected,risk,dataQuality:avgQuality,generatedAt:Date.now(),disclaimer:'評価点・買い場スコア・データ品質は判断補助指標であり、将来の上昇確率ではありません。強気・弱気の確定表示には複数のテクニカル根拠を必要とします。'}}

  window.Bitcoin1070InvestmentOS={model,commander,evidence,version:'16.2'};
  window.dispatchEvent(new CustomEvent('bitcoin1070:investment-os-ready'));
})();
