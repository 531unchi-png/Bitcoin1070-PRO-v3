// Bitcoin1070 PRO v14.0 - Daily Decision Center core
(() => {
  'use strict';
  const KEYS = {
    plans: 'bitcoin1070_trade_plans_v14',
    alerts: 'bitcoin1070_alert_rules_v14'
  };
  const read = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v ?? fallback; } catch (_) { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } };
  const num = v => Number.isFinite(Number(v)) ? Number(v) : null;
  const keyOf = a => `${a?.type || 'unknown'}:${String(a?.symbol || '').trim().toUpperCase()}`;
  const holdings = () => (Array.isArray(window.assets) ? window.assets : []).filter(a => ['crypto','jp','us','cash'].includes(a?.type));
  const priceOf = a => num(a?.currentPrice ?? a?.price ?? a?.jpyPrice ?? a?.marketPrice);
  const qtyOf = a => num(a?.amount ?? a?.quantity ?? a?.qty ?? a?.shares) || 0;
  const valueOf = a => {
    if (a?.type === 'cash') return num(a?.amount ?? a?.value) || 0;
    const explicit = num(a?.currentValue ?? a?.marketValue ?? a?.valueJpy);
    if (explicit !== null) return explicit;
    const p = priceOf(a), q = qtyOf(a); return p === null ? 0 : Math.max(0, p * q);
  };
  function signalFor(asset, daily) {
    const change = num(daily?.percent);
    if (change === null) return { level:'neutral', label:'中立', score:50, reasons:['前日比データ待ち'] };
    const reasons = [`${asset.type === 'crypto' ? '24時間比' : '前日比'} ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`];
    if (change >= 3) return { level:'bull', label:'強気', score:72, reasons };
    if (change <= -3) return { level:'bear', label:'弱気', score:28, reasons };
    return { level:'neutral', label:'中立', score:50 + Math.round(change * 4), reasons };
  }
  function health() {
    const list = holdings(); const values = list.map(a => ({ asset:a, value:valueOf(a) })).filter(x => x.value > 0);
    const total = values.reduce((s,x)=>s+x.value,0); if (!total) return { score:null, label:'データ待ち', issues:['資産評価額を取得すると診断できます'] };
    const byType = {}; values.forEach(x => { byType[x.asset.type] = (byType[x.asset.type] || 0) + x.value; });
    const topAsset = Math.max(...values.map(x=>x.value/total)); const topClass = Math.max(...Object.values(byType).map(v=>v/total));
    const cashRatio = (byType.cash || 0) / total; let risk = 0; const issues=[];
    if (topAsset > .45) { risk += 28; issues.push('単一銘柄への集中度が高め'); } else if (topAsset > .30) { risk += 15; issues.push('最大銘柄の比率を確認'); }
    if (topClass > .70) { risk += 25; issues.push('資産クラスの偏りが大きい'); } else if (topClass > .55) { risk += 12; issues.push('資産クラスがやや集中'); }
    if (cashRatio < .03) { risk += 15; issues.push('待機資金が少なめ'); }
    const score = Math.max(0, Math.min(100, 100-risk));
    return { score, label:score>=80?'良好':score>=60?'標準':score>=40?'要確認':'高リスク', issues:issues.length?issues:['大きな集中リスクは検出されていません'], total, cashRatio, topAsset, topClass };
  }
  function strategies(signals, h) {
    const out=[]; const bears=signals.filter(x=>x.signal.level==='bear'); const bulls=signals.filter(x=>x.signal.level==='bull');
    if (h.score !== null && h.score < 60) out.push({icon:'🛡️', title:'リスク配分を確認', text:h.issues[0]});
    if (bears.length) out.push({icon:'⚠️', title:`弱気シグナル ${bears.length}銘柄`, text:`${bears.slice(0,3).map(x=>x.asset.symbol).join('・')} の値動きを確認`});
    if (bulls.length) out.push({icon:'📈', title:`強気シグナル ${bulls.length}銘柄`, text:'追い買いを急がず、設定した利確ラインとの距離を確認'});
    if (!out.length) out.push({icon:'⏸️', title:'今日は様子見', text:'大きな偏りや強いシグナルは未検出。無理に売買しない選択も有効です'});
    return out.slice(0,3);
  }
  function plans(){ return read(KEYS.plans, {}); }
  function savePlan(assetKey, plan){ const all=plans(); all[assetKey]={...plan, updatedAt:new Date().toISOString()}; return write(KEYS.plans, all); }
  function alerts(){ return read(KEYS.alerts, []); }
  function saveAlerts(rules){ return write(KEYS.alerts, Array.isArray(rules)?rules:[]); }
  function evaluateAlerts(prices={}) { return alerts().filter(r=>{ const p=num(prices[r.assetKey]); const t=num(r.target); if(p===null||t===null||!r.enabled)return false; return r.operator==='>='?p>=t:p<=t; }); }
  function dailyValues(){ try { const d=JSON.parse(localStorage.getItem('bitcoin1070_daily_changes_v13_1')||'null'); return d?.values||{}; } catch(_){ return {}; } }
  function snapshot(){ const daily=dailyValues(); const signals=holdings().filter(a=>a.type!=='cash').map(asset=>({asset,signal:signalFor(asset,daily[keyOf(asset)])})); const h=health(); return {signals,health:h,strategies:strategies(signals,h)}; }
  window.Bitcoin1070DecisionCenter = { KEYS, keyOf, holdings, priceOf, valueOf, signalFor, health, strategies, plans, savePlan, alerts, saveAlerts, evaluateAlerts, snapshot };
})();
