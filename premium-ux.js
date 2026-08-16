// Bitcoin1070 PRO v13.0 - onboarding and isolated demo experience
(() => {
  'use strict';
  const DONE_KEY='bitcoin1070_v13_onboarding_done', DEMO_KEY='bitcoin1070_v13_demo';
  const demoAssets=[
    {type:'jp',symbol:'7203',name:'トヨタ自動車',amount:20,cost:2500,yahooSymbol:'7203.T'},
    {type:'us',symbol:'AAPL',name:'Apple',amount:5,cost:170,costJpy:25500,acquisitionUsdJpy:150,yahooSymbol:'AAPL'},
    {type:'crypto',symbol:'BTC',name:'Bitcoin',amount:.03,cost:9000000,coinGeckoId:'bitcoin'},
    {type:'crypto',symbol:'ETH',name:'Ethereum',amount:.5,cost:450000,coinGeckoId:'ethereum'}
  ];
  const hasProductionData=()=>['bitcoin1070_v3_assets','bitcoin1070_v3_history','bitcoin1070_v12_3_transactions','bitcoin1070_v12_1_cash_jpy'].some(k=>localStorage.getItem(k)!==null);
  function startDemo(){
    sessionStorage.setItem(DEMO_KEY,'1');
    const prefix='bitcoin1070_demo_v13::';
    localStorage.setItem(prefix+'bitcoin1070_v3_assets',JSON.stringify(demoAssets));
    localStorage.setItem(prefix+'bitcoin1070_v3_history','[]');
    localStorage.setItem(prefix+'bitcoin1070_v12_3_transactions','[]');
    localStorage.setItem(prefix+'bitcoin1070_v12_1_cash_jpy','750000');
    location.href='index.html';
  }
  function endDemo(){sessionStorage.removeItem(DEMO_KEY);location.href='index.html';}
  function demoBanner(){
    if(sessionStorage.getItem(DEMO_KEY)!=='1')return;
    document.body.classList.add('demo-mode');
    const banner=document.createElement('div');banner.className='demo-banner';banner.innerHTML='<strong>DEMO MODE</strong><span>操作は本番データに反映されません</span>';
    const button=document.createElement('button');button.type='button';button.textContent='デモ終了';button.addEventListener('click',endDemo);banner.appendChild(button);document.body.prepend(banner);
  }
  function onboarding(){
    if(location.pathname.split('/').pop()&&!location.pathname.endsWith('index.html'))return;
    if(hasProductionData()||localStorage.getItem(DONE_KEY)||sessionStorage.getItem(DEMO_KEY)==='1')return;
    const modal=document.createElement('div');modal.className='onboarding-overlay';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','welcome-title');
    modal.innerHTML='<section class="onboarding-card"><span class="eyebrow">WELCOME</span><h2 id="welcome-title">Bitcoin1070 PROへようこそ</h2><p>資産、損益、売買履歴をこの端末で管理し、1070日サイクルと未来シミュレーターを確認できます。</p><ol><li>日本円を入金</li><li>検索から保有銘柄を登録</li><li>ホームで損益を確認</li><li>設定でバックアップ</li></ol><button type="button" data-action="start">自分の資産を管理</button><button type="button" data-action="demo" class="secondary">デモを試す</button><button type="button" data-action="later" class="text-button">あとで設定</button><small>保有情報は端末内に保存されます。価格取得時は銘柄識別子を外部APIへ送信します。</small></section>';
    modal.addEventListener('click',e=>{const action=e.target.dataset.action;if(!action)return;if(action==='demo')return startDemo();localStorage.setItem(DONE_KEY,'1');modal.remove();if(action==='start')location.href='transactions.html';});document.body.appendChild(modal);
  }
  document.addEventListener('DOMContentLoaded',()=>{demoBanner();onboarding();document.querySelectorAll('[data-start-demo]').forEach(b=>b.addEventListener('click',startDemo));});
  window.B1070Premium={startDemo,endDemo,hasProductionData};
})();
