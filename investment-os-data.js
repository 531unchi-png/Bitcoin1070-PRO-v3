// Bitcoin1070 PRO v16.0 - Investment OS unified data layer
(()=>{
  'use strict';

  const DAILY_KEYS=['bitcoin1070_daily_changes_v14_0','bitcoin1070_daily_changes_v13_1'];
  const SIX_HOURS=6*60*60*1000;
  const technical=new Map();

  const numberOrNull=value=>{
    if(value===null||value===undefined||value==='') return null;
    const n=Number(value);
    return Number.isFinite(n)?n:null;
  };

  const assetKey=asset=>`${asset?.type||''}:${String(asset?.symbol||'').trim().toUpperCase()}`;

  function readDailySnapshot(){
    for(const key of DAILY_KEYS){
      try{
        const parsed=JSON.parse(localStorage.getItem(key)||'null');
        if(parsed?.values){
          return {
            values:parsed.values,
            updatedAt:numberOrNull(parsed.updatedAt??parsed.timestamp??parsed.savedAt),
            storageKey:key
          };
        }
      }catch(_){ }
    }
    return {values:{},updatedAt:null,storageKey:null};
  }

  function ingestTechnical(result){
    const asset=result?.asset;
    if(!asset) return false;
    technical.set(assetKey(asset),{...result,observedAt:Date.now()});
    window.dispatchEvent(new CustomEvent('bitcoin1070:data-layer-updated',{detail:{kind:'technical',assetKey:assetKey(asset)}}));
    return true;
  }

  function getTechnical(asset){
    const value=technical.get(assetKey(asset));
    if(!value) return null;
    if(Date.now()-value.observedAt>SIX_HOURS) return {...value,stale:true};
    return {...value,stale:false};
  }

  function dailyChange(asset){
    const center=window.Bitcoin1070DecisionCenter;
    const snapshot=readDailySnapshot();
    const key=center?.keyOf?.(asset)??assetKey(asset);
    const row=snapshot.values?.[key]??null;
    const percent=numberOrNull(row?.percent);
    const age=snapshot.updatedAt?Date.now()-snapshot.updatedAt:null;
    return {
      percent,
      label:asset?.type==='crypto'?'24時間比':'前日比',
      status:percent===null?'missing':age!==null&&age>SIX_HOURS?'stale':'live',
      updatedAt:snapshot.updatedAt,
      source:row?.source??snapshot.storageKey??null
    };
  }

  function price(asset){
    const center=window.Bitcoin1070DecisionCenter;
    const value=numberOrNull(center?.priceOf?.(asset));
    return {value,status:value===null?'missing':'live'};
  }

  function quality(asset){
    const checks=[];
    const p=price(asset);
    const d=dailyChange(asset);
    const t=getTechnical(asset);
    checks.push({name:'価格',status:p.status,weight:.32});
    checks.push({name:d.label,status:d.status,weight:.22});
    checks.push({name:'テクニカル',status:t?t.stale?'stale':'live':'missing',weight:.34});
    if(asset?.type==='crypto'&&String(asset?.symbol).toUpperCase()==='BTC'){
      let cycle=null;
      try{cycle=window.Bitcoin1070Cycle?.snapshot?.()}catch(_){ }
      checks.push({name:'1070日サイクル',status:cycle?'live':'missing',weight:.12});
    }else{
      checks.push({name:'保有情報',status:asset?'live':'missing',weight:.12});
    }
    const weight=checks.reduce((sum,item)=>sum+item.weight,0)||1;
    const points=checks.reduce((sum,item)=>sum+item.weight*(item.status==='live'?1:item.status==='stale'?.55:0),0);
    const score=Math.round(points/weight*100);
    return {
      score,
      label:score>=85?'高':score>=65?'中':'低',
      checks,
      missing:checks.filter(item=>item.status==='missing').map(item=>item.name),
      stale:checks.filter(item=>item.status==='stale').map(item=>item.name)
    };
  }

  function snapshot(asset){
    return {
      asset,
      key:assetKey(asset),
      price:price(asset),
      change:dailyChange(asset),
      technical:getTechnical(asset),
      quality:quality(asset),
      observedAt:Date.now()
    };
  }

  window.Bitcoin1070DataLayer={
    assetKey,
    numberOrNull,
    readDailySnapshot,
    dailyChange,
    price,
    ingestTechnical,
    getTechnical,
    quality,
    snapshot,
    version:'16.0'
  };
  window.dispatchEvent(new CustomEvent('bitcoin1070:data-layer-ready'));
})();
