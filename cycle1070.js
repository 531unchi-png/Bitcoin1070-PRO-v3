// Bitcoin1070 PRO v10.1 - 1070日サイクルエンジン
(() => {
  'use strict';
  const DAY = 86400000;
  const CONFIG = Object.freeze({
    theoryDays: 1070,
    previousBottom: '2022-11-21T00:00:00+09:00',
    assumedPeak: '2025-10-15T00:00:00+09:00',
    bottomWindowStart: '2026-08-01T00:00:00+09:00',
    bottomBase: '2026-10-15T00:00:00+09:00',
    bottomWindowEnd: '2026-12-31T23:59:59+09:00',
    noteUrl: 'https://note.com/mr_japanpapac'
  });

  const date = value => new Date(value);
  const daysBetween = (a,b) => Math.floor((date(b).getTime()-date(a).getTime())/DAY);
  const addDays = (value,days) => new Date(date(value).getTime()+days*DAY);
  const fmt = value => date(value).toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric'});
  const clamp = (n,min,max) => Math.min(max,Math.max(min,n));

  function snapshot(nowValue=Date.now()) {
    const now = new Date(nowValue);
    const peak = date(CONFIG.assumedPeak);
    const bottomStart = date(CONFIG.bottomWindowStart);
    const bottomBase = date(CONFIG.bottomBase);
    const bottomEnd = date(CONFIG.bottomWindowEnd);
    const nextPeakBase = addDays(bottomBase,CONFIG.theoryDays);
    const nextPeakStart = addDays(bottomStart,CONFIG.theoryDays);
    const nextPeakEnd = addDays(bottomEnd,CONFIG.theoryDays);
    const declineElapsed = Math.max(0,daysBetween(peak,now));
    const peakToBaseBottom = daysBetween(peak,bottomBase);
    let stage,stageEmoji,stageClass,headline,detail,nextEvent,nextEventDate,progress;

    if (now < peak) {
      stage='天井形成候補'; stageEmoji='🟠'; stageClass='forming';
      headline='ピーク候補へ向かう局面';
      detail='過去サイクルと同様なら、過熱と急落の両方に備える期間です。';
      nextEvent='想定ピーク'; nextEventDate=peak;
      progress=clamp((now-date(CONFIG.previousBottom))/(peak-date(CONFIG.previousBottom))*100,0,100);
    } else if (now < bottomStart) {
      stage='下落・底探し'; stageEmoji='🔴'; stageClass='decline';
      headline='高値から底候補へ向かう局面';
      detail='高値から約10〜14か月後を底候補ゾーンとして監視します。焦って底を断定しません。';
      nextEvent='底候補ゾーン開始'; nextEventDate=bottomStart;
      progress=clamp(declineElapsed/peakToBaseBottom*100,0,100);
    } else if (now <= bottomEnd) {
      stage='底候補ゾーン'; stageEmoji='⚫'; stageClass='bottom';
      headline='底形成を慎重に確認する局面';
      detail='悲観・出来高・長期サポートを確認し、分割で判断する期間です。';
      nextEvent='底候補ゾーン終了'; nextEventDate=bottomEnd;
      progress=clamp((now-bottomStart)/(bottomEnd-bottomStart)*100,0,100);
    } else if (now < nextPeakStart) {
      stage='次サイクル上昇期'; stageEmoji='🟢'; stageClass='growth';
      headline='底候補から1070日を数える局面';
      detail='底を確定日ではなく仮置きし、1070日前後を次のピーク候補として追跡します。';
      nextEvent='次回ピーク候補ゾーン開始'; nextEventDate=nextPeakStart;
      progress=clamp(daysBetween(bottomBase,now)/CONFIG.theoryDays*100,0,100);
    } else {
      stage='次回ピーク候補'; stageEmoji='🔥'; stageClass='peak';
      headline='1070日前後のピーク候補局面';
      detail='過去傾向との一致を確認しつつ、価格・需給・マクロ環境を優先します。';
      nextEvent='候補ゾーン終了'; nextEventDate=nextPeakEnd;
      progress=100;
    }

    const remaining=Math.ceil((nextEventDate-now)/DAY);
    return {
      now,stage,stageEmoji,stageClass,headline,detail,progress,
      nextEvent,nextEventDate,remaining,
      declineElapsed,
      assumedPeak:peak,bottomStart,bottomBase,bottomEnd,
      nextPeakStart,nextPeakBase,nextPeakEnd,
      previousBottom:date(CONFIG.previousBottom),
      previousPeakTarget:addDays(CONFIG.previousBottom,CONFIG.theoryDays)
    };
  }

  function renderCompact(prefix='') {
    const s=snapshot();
    const get=id=>document.getElementById(prefix+id);
    const days=get('days'), phase=get('theoryPhase'), target=get('theoryTarget'), bar=get('progressBar');
    if(days) days.textContent=s.stage==='下落・底探し' ? `${s.declineElapsed.toLocaleString('ja-JP')}日` : `${Math.round(s.progress)}%`;
    if(phase) phase.textContent=`${s.stageEmoji} ${s.stage}`;
    if(target) target.textContent=s.remaining>=0 ? `${s.nextEvent}まであと${s.remaining.toLocaleString('ja-JP')}日` : `${s.nextEvent}を${Math.abs(s.remaining).toLocaleString('ja-JP')}日通過`;
    if(bar) bar.style.width=`${clamp(s.progress,0,100).toFixed(1)}%`;
    return s;
  }

  function renderPage() {
    const s=snapshot();
    const set=(id,text)=>{const el=document.getElementById(id);if(el)el.textContent=text;};
    set('cycleStage',`${s.stageEmoji} ${s.stage}`);
    set('cycleHeadline',s.headline);
    set('cycleDetail',s.detail);
    set('cycleProgress',`${Math.round(s.progress)}%`);
    set('cycleNextEvent',s.remaining>=0?`${s.nextEvent}まであと${s.remaining.toLocaleString('ja-JP')}日`:`${s.nextEvent}を通過`);
    const bar=document.getElementById('cycleProgressBar'); if(bar)bar.style.width=`${clamp(s.progress,0,100)}%`;
    set('assumedPeakDate',fmt(s.assumedPeak));
    set('bottomWindowDate',`${fmt(s.bottomStart)}〜${fmt(s.bottomEnd)}`);
    set('bottomBaseDate',fmt(s.bottomBase));
    set('nextPeakWindowDate',`${fmt(s.nextPeakStart)}〜${fmt(s.nextPeakEnd)}`);
    set('nextPeakBaseDate',fmt(s.nextPeakBase));
    set('previousCycleResult',`${fmt(s.previousBottom)} → 1070日後 ${fmt(s.previousPeakTarget)}`);
  }

  window.Bitcoin1070Cycle={CONFIG,snapshot,renderCompact,renderPage,fmt};
  document.addEventListener('DOMContentLoaded',()=>{
    renderCompact();
    if(document.getElementById('cycleStage'))renderPage();
  });
})();
