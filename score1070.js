// Bitcoin1070 PRO v8.0 - Bitcoin1070 Index
(() => {
  'use strict';
  const HISTORY_URL = 'https://bitcoin1070-api.531unchi.workers.dev?mode=crypto-history&id=bitcoin&days=120';
  const FNG_URL = 'https://api.alternative.me/fng/?limit=1';
  const CACHE_KEY = 'bitcoin1070_v8_score_cache';

  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const round=(n,d=1)=>Number(Number(n).toFixed(d));
  const avg=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
  function ema(values,period){
    if(values.length<period) return [];
    const k=2/(period+1); let prev=avg(values.slice(0,period)); const out=Array(period-1).fill(null).concat(prev);
    for(let i=period;i<values.length;i++){prev=values[i]*k+prev*(1-k);out.push(prev);} return out;
  }
  function rsi(values,period=14){
    if(values.length<=period) return 50;
    let gains=0,losses=0;
    for(let i=values.length-period;i<values.length;i++){const d=values[i]-values[i-1];if(d>=0)gains+=d;else losses-=d;}
    if(losses===0) return 100; const rs=(gains/period)/(losses/period); return 100-(100/(1+rs));
  }
  function macd(values){
    const e12=ema(values,12),e26=ema(values,26); const line=values.map((_,i)=>e12[i]!=null&&e26[i]!=null?e12[i]-e26[i]:null);
    const compact=line.filter(v=>v!=null), sig=ema(compact,9); const m=line.at(-1)??0,s=sig.at(-1)??m; return {line:m,signal:s,hist:m-s};
  }
  function bollinger(values,period=20){
    const w=values.slice(-period),m=avg(w),sd=Math.sqrt(avg(w.map(v=>(v-m)**2))); return {middle:m,upper:m+2*sd,lower:m-2*sd,position:sd?((values.at(-1)-(m-2*sd))/(4*sd))*100:50};
  }
  function levels(values){
    const w=values.slice(-30),current=w.at(-1),support=Math.min(...w),resistance=Math.max(...w);
    return {support,resistance,supportDistance:(current-support)/current*100,resistanceDistance:(resistance-current)/current*100};
  }
  function theory(){
    const start=new Date('2022-11-21T00:00:00+09:00'),days=Math.floor((Date.now()-start.getTime())/86400000),progress=days/1070*100;
    let points=0,note='';
    if(progress<45){points=18;note='1070日サイクル前半';}
    else if(progress<70){points=27;note='1070日サイクル成長局面';}
    else if(progress<88){points=24;note='1070日サイクル後半';}
    else if(progress<100){points=14;note='1070日サイクル終盤';}
    else {points=6;note='1070日基準通過後';}
    return {days,progress,points,note};
  }
  async function fetchJson(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}
  function scoreFear(v){if(v<=20)return 17;if(v<=35)return 19;if(v<=55)return 16;if(v<=70)return 12;if(v<=80)return 7;return 3;}
  function scoreRsi(v){if(v<30)return 11;if(v<=55)return 15;if(v<=65)return 13;if(v<=70)return 9;if(v<=80)return 5;return 2;}
  function scoreMacd(m){if(m.hist>0&&m.line>0)return 15;if(m.hist>0)return 12;if(m.hist>-Math.abs(m.line)*.1)return 8;return 3;}
  function scoreBb(b){if(b.position<0)return 8;if(b.position<=35)return 9;if(b.position<=80)return 10;if(b.position<=100)return 6;return 2;}
  function scoreLevels(l){if(l.supportDistance<=3)return 10;if(l.supportDistance<=7)return 8;if(l.resistanceDistance<=2)return 3;return 6;}
  function label(total){if(total>=80)return ['攻め相場','★★★★★'];if(total>=60)return ['やや強気','★★★★☆'];if(total>=40)return ['様子見','★★★☆☆'];return ['警戒','★★☆☆☆'];}
  function strategy(total,rsiValue,fear){
    if(total>=80&&rsiValue<70)return '強気基調。ただし一括購入ではなく、押し目を分けて確認する局面。';
    if(total>=60)return fear>=75?'相場は強い一方で心理は過熱。新規追随より保有継続と利確基準の確認。':'保有継続を基本に、サポート接近時だけ少額で検討。';
    if(total>=40)return '方向感が弱い。新規投資を急がず、サポートとMACDの改善待ち。';
    return '守り優先。現金余力を確保し、反転確認まで無理な買い増しを避ける。';
  }
  function render(data){
    const {total,items,positives,risks,rsiValue,fearValue}=data,[text,stars]=label(total);
    const gauge=document.getElementById('scoreGauge'); if(gauge)gauge.style.setProperty('--score',total);
    document.getElementById('scoreValue').textContent=total;
    document.getElementById('scoreLabel').textContent=text;
    document.getElementById('scoreStars').textContent=stars;
    document.getElementById('scoreMessage').textContent= total>=80?'複数指標が強気方向で一致しています。':total>=60?'強気材料が優勢ですが、過熱指標も確認してください。':total>=40?'強弱が交錯しています。明確な方向が出るまで待機寄りです。':'弱気材料が優勢です。リスク管理を最優先にしてください。';
    document.getElementById('scoreUpdatedAt').textContent=`更新 ${new Date(data.updatedAt).toLocaleString('ja-JP')}`;
    document.getElementById('scoreBreakdown').innerHTML=items.map(i=>`<div class="score-row"><span>${i.name}<small>${i.note}</small></span><strong>${i.points}/${i.max}</strong></div>`).join('');
    const list=(arr,empty)=>arr.length?arr.map(x=>`<div class="signal-pill">${x}</div>`).join(''):`<p class="small">${empty}</p>`;
    document.getElementById('positiveSignals').innerHTML=list(positives,'目立った強気サインはありません');
    document.getElementById('riskSignals').innerHTML=list(risks,'目立った危険サインはありません');
    document.getElementById('todayStrategy').textContent=strategy(total,rsiValue,fearValue);
  }
  async function calculate(){
    const btn=document.getElementById('refreshScoreButton'); if(btn){btn.disabled=true;btn.textContent='計算中...';}
    try{
      const [market,fng]=await Promise.all([fetchJson(HISTORY_URL),fetchJson(FNG_URL)]);
      const prices=(market.prices||[]).map(x=>Number(x[1])).filter(Number.isFinite); if(prices.length<35)throw new Error('価格履歴不足');
      const fearValue=Number(fng?.data?.[0]?.value); const rsiValue=rsi(prices),m=macd(prices),b=bollinger(prices),l=levels(prices),t=theory();
      const items=[
        {name:'1070日理論',points:t.points,max:30,note:`${Math.round(t.progress)}%・${t.note}`},
        {name:'Fear & Greed',points:scoreFear(fearValue),max:20,note:`${fearValue}`},
        {name:'RSI（14日）',points:scoreRsi(rsiValue),max:15,note:`${round(rsiValue)}`},
        {name:'MACD',points:scoreMacd(m),max:15,note:m.hist>=0?'上向き':'下向き'},
        {name:'ボリンジャーバンド',points:scoreBb(b),max:10,note:`位置 ${round(b.position)}%`},
        {name:'サポート・レジスタンス',points:scoreLevels(l),max:10,note:`支持線まで ${round(l.supportDistance)}%`}
      ];
      const total=clamp(Math.round(items.reduce((s,i)=>s+i.points,0)),0,100), positives=[],risks=[];
      if(m.hist>0)positives.push('MACDが上向き');else risks.push('MACDが下向き');
      if(rsiValue>=45&&rsiValue<=65)positives.push(`RSI ${round(rsiValue)}で健全`);if(rsiValue>=70)risks.push(`RSI ${round(rsiValue)}で過熱`);if(rsiValue<=30)positives.push('RSIが売られすぎ圏');
      if(fearValue<=35)positives.push('市場心理は恐怖寄り');if(fearValue>=75)risks.push('市場心理は極度の強欲');
      if(l.supportDistance<=4)positives.push('主要サポートが近い');if(l.resistanceDistance<=2)risks.push('直上にレジスタンス');
      if(t.progress>=88)risks.push('1070日サイクル終盤');else positives.push('1070日基準まで余地あり');
      const data={total,items,positives,risks,rsiValue,fearValue,updatedAt:Date.now()}; localStorage.setItem(CACHE_KEY,JSON.stringify(data));render(data);
    }catch(e){console.error('Bitcoin1070指数取得失敗',e);const cached=localStorage.getItem(CACHE_KEY);if(cached){render(JSON.parse(cached));document.getElementById('scoreUpdatedAt').textContent+='（保存データ）';}else{document.getElementById('scoreValue').textContent='--';document.getElementById('scoreLabel').textContent='取得失敗';document.getElementById('scoreMessage').textContent='通信を確認して、更新ボタンを押してください。';}}
    finally{if(btn){btn.disabled=false;btn.textContent='↻ 更新';}}
  }
  document.addEventListener('DOMContentLoaded',()=>{calculate();document.getElementById('refreshScoreButton')?.addEventListener('click',calculate);});
})();
