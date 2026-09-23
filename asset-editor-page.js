// Bitcoin1070 PRO v10.1 - かな前方一致／銘柄名／シンボル検索
const DEFAULT_ASSETS = [];
const SEARCH_API_URL = 'https://bitcoin1070-api.531unchi.workers.dev';
let assets = loadAssetsFromStorage(DEFAULT_ASSETS);
let transactionHistory = loadHistoryFromStorage();
const ASSET_MASTER = Array.isArray(window.B1070_ASSET_MASTER) ? window.B1070_ASSET_MASTER : [];
const FUND_PRESETS = {
    '0331418A': 'eMAXIS Slim 全世界株式（オール・カントリー）',
    '03311187': 'eMAXIS Slim 米国株式（S&P500）'
};
let remoteSuggestions = [];
let searchTimer = null;
let searchRequestId = 0;

function escapeHtml(value) {
    return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}
function typeLabel(type){ return type==='crypto'?'仮想通貨':type==='jp'?'日本株':type==='fund'?'投資信託':'米国株'; }
function normalizeSymbol(value,type){
    let symbol=String(value||'').trim().toUpperCase();
    if(type==='jp') symbol=symbol.replace(/\.T$/i,'');
    return symbol;
}
function kataToHira(value){
  return String(value||'').replace(/[ァ-ヶ]/g,ch=>String.fromCharCode(ch.charCodeAt(0)-0x60));
}
function normalizeSearchText(value){
  return kataToHira(String(value||'').normalize('NFKC').toLowerCase())
    .replace(/[\s・･,.，。()（）\-ー]/g,'');
}
function searchableValues(item){
  return [item.symbol,item.name,item.reading,item.yahooSymbol,item.coinGeckoId,...(item.keywords||[])]
    .map(v=>normalizeSearchText(v)).filter(Boolean);
}
function matchRank(item,q){
  const vals=searchableValues(item);
  if(vals.some(v=>v===q)) return 0;
  if(vals.some(v=>v.startsWith(q))) return 1;
  if(vals.some(v=>v.includes(q))) return 2;
  return 9;
}
function findMaster(query,type){
    const q=normalizeSearchText(query);
    if(!q) return null;
    const source=[...ASSET_MASTER,...remoteSuggestions];
    const exact = source.find(item => searchableValues(item).some(v=>v===q));
    if(exact) return exact;
    const preferred = source.find(item => item.type===type && searchableValues(item).some(v=>v.includes(q)));
    return preferred || source.find(item => searchableValues(item).some(v=>v.includes(q))) || null;
}
function uniqueItems(items){
  const seen=new Set();
  return items.filter(item=>{
    const key=`${item.type}:${item.coinGeckoId||item.yahooSymbol||item.symbol}`;
    if(seen.has(key)) return false; seen.add(key); return true;
  });
}
function getLocalSuggestions(query,type){
    const q=normalizeSearchText(query);
    const source = q
      ? ASSET_MASTER.filter(item=>matchRank(item,q)<9)
      : ASSET_MASTER.filter(item=>item.type===type);
    return source.sort((a,b)=>{
      const ae=a.type===type?0:1, be=b.type===type?0:1;
      if(ae!==be) return ae-be;
      const rankDiff=matchRank(a,q)-matchRank(b,q);
      if(rankDiff!==0) return rankDiff;
      const ar=normalizeSearchText(a.reading||a.name), br=normalizeSearchText(b.reading||b.name);
      return ar.localeCompare(br,'ja') || a.symbol.localeCompare(b.symbol,'ja');
    }).slice(0,50);
}
function setAssetType(nextType){
  const select=document.getElementById('newAssetType');
  if(select && select.value!==nextType){ select.value=nextType; updateTypeFields(); }
}
function renderAssetEditor() {
    const editor=document.getElementById('editor'); if(!editor) return;
    const items=assets.map((asset,index)=>{
      const costUnit=asset.type==='us'?'ドル':asset.type==='fund'?'円/1万口':'円';
      const marketCode=asset.type==='fund'?'':asset.type==='crypto'
        ? `<label>CoinGecko ID<input type="text" data-index="${index}" data-field="coinGeckoId" value="${escapeHtml(asset.coinGeckoId||'')}" placeholder="例：bitcoin"></label>`
        : `<label>Yahoo Financeコード<input type="text" data-index="${index}" data-field="yahooSymbol" value="${escapeHtml(asset.yahooSymbol||'')}" placeholder="例：285A.T / NVDA"></label>`;
      const acquisitionFx=asset.type==='us'?`<label>取得時 USD/JPY <span class="field-hint">必須（損益計算）</span><input type="number" inputmode="decimal" step="any" min="0.01" data-index="${index}" data-field="acquisitionUsdJpy" value="${asset.acquisitionUsdJpy??''}" placeholder="例：150.25"><small class="input-help">現在の為替ではなく、取得時のレートを入力してください。</small></label>`:'';
      const fundFields=asset.type==='fund'?`<label>最新基準価額（円/1万口）<input type="number" inputmode="decimal" min="0.01" step="any" data-index="${index}" data-field="navJpy" value="${asset.navJpy}"></label><label>基準価額の公表日<input type="date" data-index="${index}" data-field="navDate" value="${asset.navDate}"></label>`:'';
      const accountField=asset.type==='crypto'?'':`<label>口座区分<select data-index="${index}" data-field="accountType"><option value="nisa" ${asset.accountType==='nisa'?'selected':''}>NISA</option><option value="taxable" ${asset.accountType==='taxable'?'selected':''}>課税口座</option><option value="unknown" ${!['nisa','taxable'].includes(asset.accountType)?'selected':''}>未設定</option></select></label>`;
      return `<section class="card editor-page-item"><div class="editor-page-title"><div><strong>${escapeHtml(asset.name)}</strong><span>${escapeHtml(asset.symbol)} ・ ${typeLabel(asset.type)}</span></div><button type="button" class="delete-button" data-delete-index="${index}">🗑 削除</button></div><div class="editor-page-grid"><label>銘柄名<input type="text" data-index="${index}" data-field="name" value="${escapeHtml(asset.name)}"></label><label>${asset.type==='fund'?'保有口数':'数量・株数'}<input type="number" inputmode="decimal" step="any" min="0" data-index="${index}" data-field="amount" value="${asset.amount}"></label><label>平均取得単価（${costUnit}）<input type="number" inputmode="decimal" step="any" min="0" data-index="${index}" data-field="cost" value="${asset.cost===null||asset.cost===undefined?'':asset.type==='fund'?asset.cost*10000:asset.cost}"></label>${acquisitionFx}${marketCode}${fundFields}${accountField}</div></section>`;
    }).join('');
    const cashBalance = typeof loadCashBalance === 'function' ? loadCashBalance() : 0;
    const cashCard = `<section class="card cash-editor-card"><h2>💴 日本円（現金）</h2><p class="small">銀行口座・証券口座の買付余力など、資産として管理したい日本円を入力してください。価格取得や損益計算の対象にはしません。</p><label>日本円残高（円）<input id="cashBalanceInput" type="number" inputmode="numeric" step="1" min="0" value="${cashBalance}" placeholder="例：86288"></label><button id="saveCashButton" type="button" class="full-width-button">💾 日本円を保存</button></section>`;
    const fundCard=`<section class="card add-asset-card"><h2>🌐 投資信託を登録</h2><p class="small">基準価額・取得単価は円/1万口。保有口数はSBI証券の表示を入力。価額は自動更新しません。<a href="https://www.am.mufg.jp/fund/253425.html" target="_blank" rel="noopener noreferrer">オルカン公式の基準価額を見る ↗</a></p><div class="editor-page-grid"><label>ファンドを選択<select id="fundPreset"><option value="0331418A">eMAXIS Slim 全世界株式（オール・カントリー）</option><option value="03311187">eMAXIS Slim 米国株式（S&P500）</option><option value="custom">その他（手入力）</option></select></label><label>投信協会コード<input id="fundSymbol" value="0331418A" maxlength="40"></label><label>ファンド名<input id="fundName" value="eMAXIS Slim 全世界株式（オール・カントリー）"></label><label>保有口数<input id="fundAmount" type="number" inputmode="decimal" step="any" min="0.000001" placeholder="例：150000"></label><label>平均取得単価（円/1万口、任意）<input id="fundCost" type="number" inputmode="decimal" step="any" min="0"></label><label>最新基準価額（円/1万口）<input id="fundNav" type="number" inputmode="decimal" step="any" min="0.01"></label><label>基準価額の公表日<input id="fundNavDate" type="date"></label><label>口座区分<select id="fundAccount"><option value="unknown">未設定</option><option value="nisa">NISA</option><option value="taxable">課税口座</option></select></label></div><button id="addFundButton" type="button" class="full-width-button">投資信託を登録</button></section>`;
    editor.innerHTML=`${cashCard}${items||'<div class="card"><p>保有資産がまだありません。</p></div>'}${fundCard}<section class="card add-asset-card"><h2>➕ 新しい銘柄を追加</h2><p class="small">シンボルでも銘柄名でも検索できます。日本株・米国株・仮想通貨をオンライン検索し、ひらがな・カタカナ・漢字・証券コードで検索できます。入力文字で始まる候補を優先表示します。</p><div class="editor-page-grid"><label>種類<select id="newAssetType"><option value="crypto">仮想通貨</option><option value="jp">日本株</option><option value="us">米国株</option></select></label><label class="asset-search-label">シンボル・銘柄検索<input id="newAssetSymbol" type="text" autocomplete="off" placeholder="あ / あい / ソフトバンク / 9984 / BTC"><div id="assetSuggestions" class="asset-suggestions hidden"></div></label><label>銘柄名<input id="newAssetName" type="text" placeholder="候補選択で自動入力"></label><label>数量・株数<input id="newAssetAmount" type="number" inputmode="decimal" step="any" min="0" placeholder="0"></label><label>平均取得単価 <span id="costUnitHint" class="field-hint">円</span><input id="newAssetCost" type="number" inputmode="decimal" step="any" min="0" placeholder="0"></label><label id="newAcquisitionFxField" class="hidden">取得時 USD/JPY <span class="field-hint">必須（損益計算）</span><input id="newAssetAcquisitionUsdJpy" type="number" inputmode="decimal" step="any" min="0.01" placeholder="例：150.25"><small class="input-help">現在の為替ではなく、取得時のレートを入力してください。</small></label><label id="coinGeckoField">CoinGecko ID<input id="newCoinGeckoId" type="text" placeholder="候補選択で自動入力"></label><label id="newAccountField">口座区分<select id="newAssetAccount"><option value="unknown">未設定</option><option value="nisa">NISA</option><option value="taxable">課税口座</option></select></label><label id="yahooField" class="hidden">Yahoo Financeコード<input id="newYahooSymbol" type="text" placeholder="候補選択で自動入力"></label></div><div id="autoFillStatus" class="auto-fill-status">🔍 シンボルまたは銘柄名を入力してください</div><button id="addAssetButton" type="button" class="full-width-button">➕ 銘柄を追加</button></section>`;
    editor.querySelectorAll('[data-delete-index]').forEach(b=>b.addEventListener('click',()=>deleteAsset(Number(b.dataset.deleteIndex))));
    document.getElementById('saveCashButton')?.addEventListener('click',()=>{ const input=document.getElementById('cashBalanceInput'); const value=Math.max(0,Math.floor(Number(input?.value)||0)); saveCashBalance(value); invalidatePerformanceHistory(); transactionHistory.unshift({id:Date.now(),date:new Date().toISOString(),action:`日本円残高を ¥${value.toLocaleString('ja-JP')} に更新`}); saveHistoryToStorage(transactionHistory); alert('日本円残高を保存しました！'); });
    document.getElementById('fundPreset')?.addEventListener('change',event=>{
      const code=event.target.value;
      document.getElementById('fundSymbol').value=code==='custom'?'':code;
      document.getElementById('fundName').value=FUND_PRESETS[code]||'';
      for(const id of ['fundAmount','fundCost','fundNav','fundNavDate'])document.getElementById(id).value='';
    });
    document.getElementById('addFundButton')?.addEventListener('click',addFundHolding);
    bindAddForm();
}
function bindAddForm(){
  const type=document.getElementById('newAssetType'), input=document.getElementById('newAssetSymbol');
  type?.addEventListener('change',()=>{ updateTypeFields(); clearAutoFields(); queueSearch(true); });
  input?.addEventListener('input',()=>queueSearch(false));
  input?.addEventListener('focus',()=>queueSearch(true));
  document.addEventListener('click',e=>{ if(!e.target.closest('.asset-search-label')) document.getElementById('assetSuggestions')?.classList.add('hidden'); });
  document.getElementById('addAssetButton')?.addEventListener('click',addAsset);
  updateTypeFields();
}
function updateTypeFields(){
  const type=document.getElementById('newAssetType')?.value;
  document.getElementById('coinGeckoField')?.classList.toggle('hidden',type!=='crypto');
  document.getElementById('yahooField')?.classList.toggle('hidden',type==='crypto');
  document.getElementById('newAcquisitionFxField')?.classList.toggle('hidden',type!=='us');
  document.getElementById('newAccountField')?.classList.toggle('hidden',type==='crypto');
  const hint=document.getElementById('costUnitHint'); if(hint) hint.textContent=type==='us'?'ドル':'円';
}
function clearAutoFields(){ ['newAssetName','newCoinGeckoId','newYahooSymbol'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; }); remoteSuggestions=[]; }
function queueSearch(immediate){
  clearTimeout(searchTimer);
  if(immediate) runSearch(); else searchTimer=setTimeout(runSearch,350);
}
function renderSuggestions(list,message=''){
  const box=document.getElementById('assetSuggestions'); if(!box) return;
  if(message) box.innerHTML=`<div class="empty-suggestion">${escapeHtml(message)}</div>`;
  else box.innerHTML=list.map((item,index)=>`<button type="button" class="asset-suggestion" data-result-index="${index}"><strong>${escapeHtml(item.symbol)}</strong><span>${escapeHtml(item.name)}</span><small>${escapeHtml(typeLabel(item.type))} ・ ${escapeHtml(item.coinGeckoId||item.yahooSymbol||'')}</small></button>`).join('')||'<div class="empty-suggestion">候補が見つかりません。コードを確認してください。</div>';
  box.classList.remove('hidden');
  box.querySelectorAll('[data-result-index]').forEach(btn=>btn.addEventListener('click',()=>{ const item=list[Number(btn.dataset.resultIndex)]; if(item) applyMaster(item,true); }));
}
async function runSearch(){
  const input=document.getElementById('newAssetSymbol'), type=document.getElementById('newAssetType')?.value;
  if(!input) return;
  const query=input.value.trim();
  const local=getLocalSuggestions(query,type);
  if(!query){ renderSuggestions(local); return; }
  renderSuggestions(local.length?local:[], local.length?'':'検索中…');
  const currentId=++searchRequestId;
  const status=document.getElementById('autoFillStatus'); if(status) status.textContent='🔄 オンラインで銘柄を検索中…';
  try{
    const endpoint=`${SEARCH_API_URL}?mode=asset-search&q=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}`;
    const response=await fetch(endpoint,{cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const data=await response.json();
    if(currentId!==searchRequestId) return;
    remoteSuggestions=Array.isArray(data.results)?data.results:[];
    const qn=normalizeSearchText(query);
    const combined=uniqueItems([...local,...remoteSuggestions]).sort((a,b)=>matchRank(a,qn)-matchRank(b,qn)||(normalizeSearchText(a.reading||a.name)).localeCompare(normalizeSearchText(b.reading||b.name),'ja')).slice(0,50);
    renderSuggestions(combined);
    if(status) status.textContent=combined.length?`✅ ${combined.length}件の候補を表示中（前方一致優先）`:'⚠️ 候補が見つかりません。';
  }catch(error){
    if(currentId!==searchRequestId) return;
    // 日本株コードはAPI障害時も登録可能にする
    if(type==='jp' && /^(?:\d{4}|\d{3}[A-Z])$/i.test(query)){
      const symbol=query.toUpperCase();
      remoteSuggestions=[{type:'jp',symbol,name:`日本株 ${symbol}`,yahooSymbol:`${symbol}.T`,source:'offline-fallback'}];
      renderSuggestions(uniqueItems([...local,...remoteSuggestions]));
      if(status) status.textContent='⚠️ 銘柄名取得に失敗。Yahooコードは自動作成できます。';
    }else{
      renderSuggestions(local,local.length?'':'通信に失敗しました。もう一度入力してください。');
      if(status) status.textContent='⚠️ 検索APIに接続できませんでした';
    }
  }
}
function applyMaster(item,close){
  setAssetType(item.type);
  document.getElementById('newAssetSymbol').value=item.symbol;
  document.getElementById('newAssetName').value=item.name;
  document.getElementById('newCoinGeckoId').value=item.coinGeckoId||'';
  document.getElementById('newYahooSymbol').value=item.yahooSymbol||(item.type==='jp'?`${item.symbol}.T`:item.type==='us'?item.symbol:'');
  const status=document.getElementById('autoFillStatus'); if(status) status.textContent=`✅ ${item.name} の情報を自動入力しました`;
  if(close) document.getElementById('assetSuggestions')?.classList.add('hidden');
}
function invalidatePerformanceHistory(){ const key=activeStorageKey(ASSET_SNAPSHOTS_KEY); try{const rows=JSON.parse(localStorage.getItem(key)||'[]'); if(Array.isArray(rows))localStorage.setItem(key,JSON.stringify(rows.map(row=>({...row,complete:false}))));}catch(_){} }
function addFundHolding(){
  try{
    const symbol=document.getElementById('fundSymbol').value.trim().toUpperCase(),name=document.getElementById('fundName').value.trim();
    const rawAmount=document.getElementById('fundAmount').value,rawNav=document.getElementById('fundNav').value,rawCost=document.getElementById('fundCost').value;
    const amount=Number(rawAmount),navJpy=Number(rawNav),navDate=document.getElementById('fundNavDate').value;
    if(!symbol||!name||!rawAmount||!Number.isFinite(amount)||amount<=0||!rawNav||!Number.isFinite(navJpy)||navJpy<=0||!navDate)throw Error('コード・名前・保有口数・基準価額・公表日を入力してください');
    if(assets.some(a=>a.type==='fund'&&a.symbol===symbol))throw Error('同じ投資信託がすでに登録されています');
    const cost=rawCost===''?null:Number(rawCost)/10000;
    const fund=sanitizeAsset({type:'fund',symbol,name,amount,cost,navJpy,navDate,accountType:document.getElementById('fundAccount').value});
    const next=assets.map(asset=>({...asset}));collectChanges(next);next.push(fund);
    const sanitized=next.map(sanitizeAsset);saveAssetsToStorage(sanitized);assets=sanitized;invalidatePerformanceHistory();
    transactionHistory.unshift({id:Date.now(),date:new Date().toISOString(),action:`${name}を登録`});saveHistoryToStorage(transactionHistory);renderAssetEditor();alert('投資信託を登録しました');
  }catch(error){alert(error.message)}
}
function collectChanges(target=assets){ document.querySelectorAll('#editor [data-index][data-field]').forEach(input=>{ const asset=target[Number(input.dataset.index)]; if(!asset)return; const field=input.dataset.field; if(field==='acquisitionUsdJpy'){setUsAssetAcquisitionFx(asset,input.value.trim());return;} if(field==='cost'){asset.cost=input.value.trim()===''?null:Number(input.value)/(asset.type==='fund'?10000:1);return;} asset[field]=(field==='amount'||field==='navJpy')?Number(input.value):input.value.trim(); }); }
function saveChanges(){ try{const next=assets.map(asset=>({...asset}));collectChanges(next);const sanitized=next.map(sanitizeAsset),holdingsChanged=sanitized.some((asset,i)=>asset.amount!==assets[i].amount);saveAssetsToStorage(sanitized);assets=sanitized;if(holdingsChanged)invalidatePerformanceHistory(); transactionHistory.unshift({id:Date.now(),date:new Date().toISOString(),action:'保有資産を編集'}); saveHistoryToStorage(transactionHistory); const button=document.getElementById('saveButton'); if(button){const old=button.textContent;button.textContent='✅ 保存しました';button.disabled=true;setTimeout(()=>{button.textContent=old;button.disabled=false},1400);} let feedback=document.getElementById('saveFeedback'); if(!feedback){feedback=document.createElement('div');feedback.id='saveFeedback';feedback.className='save-feedback';document.querySelector('.sticky-save-bar')?.appendChild(feedback);} feedback.textContent='ホーム・資産ページにも保存内容が反映されました。'; renderAssetEditor();}catch(error){alert(error.message)} }
function deleteAsset(index){ const asset=assets[index]; if(!asset||!confirm(`${asset.name}（${asset.symbol}）を削除しますか？`))return; assets.splice(index,1); transactionHistory.unshift({id:Date.now(),date:new Date().toISOString(),action:`${asset.name}（${asset.symbol}）を削除`}); saveAssetsToStorage(assets);invalidatePerformanceHistory();saveHistoryToStorage(transactionHistory);renderAssetEditor(); }
function addAsset(){
  collectChanges();
  const type=document.getElementById('newAssetType').value;
  let symbol=normalizeSymbol(document.getElementById('newAssetSymbol').value,type);
  const auto=findMaster(symbol,type); if(auto){ applyMaster(auto,false); symbol=auto.symbol; }
  let name=document.getElementById('newAssetName').value.trim();
  const amount=Math.max(0,Number(document.getElementById('newAssetAmount').value)||0);
  const cost=Math.max(0,Number(document.getElementById('newAssetCost').value)||0);
  const acquisitionUsdJpy=document.getElementById('newAssetAcquisitionUsdJpy').value.trim();
  const coinGeckoId=document.getElementById('newCoinGeckoId').value.trim().toLowerCase();
  let yahooSymbol=document.getElementById('newYahooSymbol').value.trim().toUpperCase();
  if(type==='jp' && !yahooSymbol && symbol) yahooSymbol=`${symbol}.T`;
  if(type==='us' && !yahooSymbol && symbol) yahooSymbol=symbol;
  if(!name && type==='jp') name=`日本株 ${symbol}`;
  if(!symbol||!name)return alert('検索候補を選ぶか、シンボルと銘柄名を入力してください');
  if(assets.some(a=>a.type===type&&normalizeSymbol(a.symbol,a.type)===symbol))return alert('同じ銘柄がすでに登録されています');
  if(type==='crypto'&&!coinGeckoId)return alert('仮想通貨は検索候補を選ぶか、CoinGecko IDを入力してください');
  if(type!=='crypto'&&!yahooSymbol)return alert('Yahoo Financeコードを入力してください');
  const asset={type,symbol,name,amount,cost,...(type!=='crypto'?{accountType:document.getElementById('newAssetAccount').value}:{})}; if(type==='crypto')asset.coinGeckoId=coinGeckoId;else asset.yahooSymbol=yahooSymbol;
  if(type==='us'&&acquisitionUsdJpy)setUsAssetAcquisitionFx(asset,acquisitionUsdJpy);
  assets.push(asset); transactionHistory.unshift({id:Date.now(),date:new Date().toISOString(),action:`${name}（${symbol}）を追加`}); saveAssetsToStorage(assets);invalidatePerformanceHistory();saveHistoryToStorage(transactionHistory);renderAssetEditor();alert(`${name}を追加しました！`);
}
document.addEventListener('DOMContentLoaded',()=>{renderAssetEditor();document.getElementById('saveButton')?.addEventListener('click',saveChanges);});
