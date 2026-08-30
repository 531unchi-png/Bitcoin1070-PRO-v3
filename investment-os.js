// Bitcoin1070 PRO v16.0 - Unified Investment OS decision engine
(()=>{
  'use strict';
  const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));

  function model(asset){
    const pro=window.Bitcoin1070ProfessionalAI;
    const data=window.Bitcoin1070DataLayer;
    if(!pro||!data) return null;
    const factor=pro.factorScore(asset);
    const opportunity=pro.crashRadar(asset);
    const anomaly=pro.anomaly(asset);
    const plan=pro.tradePlan(asset);
    const quality=data.quality(asset);
    if(!factor) return null;
    const confidence=Math.round(clamp((factor.confidence?.score||0)*.65+quality.score*.35));
    const missing=(quality.missing||[]).filter(Boolean);
    const stale=(quality.stale||[]).filter(Boolean);
    const provisional=confidence<55;
    let action='様子見';
    if(provisional) action='暫定評価';
    else if(anomaly?.level==='high') action='異常値動きを確認';
    else if(opportunity?.score>=78&&factor.score>=48) action='買い場を精査';
    else if(factor.score>=72) action='強気継続を監視';
    else if(factor.score<=34) action='縮小・撤退条件を確認';
    const statusDetail=provisional
      ? (missing.length?`不足: ${missing.join(' / ')}`:stale.length?`更新待ち: ${stale.join(' / ')}`:'判断材料が不足しているため暫定評価')
      : (stale.length?`一部更新待ち: ${stale.join(' / ')}`:'主要データ取得済み');
    return {asset,factor,opportunity,anomaly,plan,quality,confidence,action,provisional,missing,stale,statusDetail};
  }

  function priority(row){
    if(!row) return 0;
    let score=0;
    if(row.anomaly?.level==='high') score+=100;
    if(row.factor?.score<=34&&row.confidence>=55) score+=75;
    if(row.opportunity?.score>=78&&row.confidence>=55) score+=70;
    if(row.opportunity?.score>=65&&row.confidence>=55) score+=45;
    score+=Math.abs((row.factor?.score||50)-50)*.35;
    score+=row.confidence*.1;
    return score;
  }

  function commander(){
    const center=window.Bitcoin1070DecisionCenter;
    if(!center) return null;
    const rows=(center.holdings?.()||[]).map(model).filter(Boolean);
    const ranked=[...rows].sort((a,b)=>priority(b)-priority(a));
    const actions=ranked.filter(row=>row.action!=='様子見').slice(0,3);
    const selected=actions.length?actions:ranked.slice(0,1);
    const risk=window.Bitcoin1070ProfessionalAI?.riskBudget?.()||null;
    const avgQuality=rows.length?Math.round(rows.reduce((s,r)=>s+r.quality.score,0)/rows.length):0;
    return {
      rows,
      actions:selected,
      risk,
      dataQuality:avgQuality,
      generatedAt:Date.now(),
      disclaimer:'評価点・買い場スコア・データ品質は判断補助指標であり、将来の上昇確率ではありません。暫定評価は不足データを含むため売買判断を確定しないでください。'
    };
  }

  window.Bitcoin1070InvestmentOS={model,commander,version:'16.0.1'};
  window.dispatchEvent(new CustomEvent('bitcoin1070:investment-os-ready'));
})();
