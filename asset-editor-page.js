// Bitcoin1070 PRO v10.1 - かな前方一致／銘柄名／シンボル検索
const DEFAULT_ASSETS = [];
const SEARCH_API_URL = 'https://bitcoin1070-api.531unchi.workers.dev';
let assets = loadAssetsFromStorage(DEFAULT_ASSETS);
let transactionHistory = loadHistoryFromStorage();
const ASSET_MASTER = Array.isArray(window.B1070_ASSET_MASTER) ? window.B1070_ASSET_MASTER : [];
let remoteSuggestions = [];
let searchTimer = null;
let searchRequestId = 0;

function escapeHtml(value) {
    return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}
function typeLabel(type){ return type==='crypto'?'仮想通貨':type==='jp'?'日本株':'米国株'; }
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
      const costUnit=asset.type==='us'?'ドル':'円';
      const marketCode=asset.type==='crypto'
        ? `<label>CoinGecko ID<input type="text" data-index="${index}" data-field="coinGeckoId" value="${escapeHtml(asset.coinGeckoId||'')}" placeholder="例：bitcoin"></label>`
        : `<label>Yahoo Financeコード<input type="text" data-index="${index}" data-field="yahooSymbol" value="${escapeHtml(asset.yahooSymbol||'')}" placeholder="例：285A.T / NVDA"></label>`;
      return `<section class="card editor-page-item"><div class="editor-page-title"><div><strong>${escapeHtml(asset.name)}</strong><span>${escapeHtml(asset.symbol)} ・ ${typeLabel(asset.type)}</span></div><button type="button" class="delete-button" data-delete-index="${index}">🗑 削除</button></div><div class="editor-page-grid"><label>銘柄名<input type="text" data-index="${index}" data-field="name" value="${escapeHtml(asset.name)}"></label><label>数量・株数<input type="number" inputmode="decimal" step="any" min="0" data-index="${index}" data-field="amount" value="${asset.amount}"></label><label>平均取得単価（${costUnit}）<input type="number" inputmode="decimal" step="any" min="0" data-index="${index}" data-field="cost" value="${asset.cost}"></label>${marketCode}</div></section>`;
    }).join('');
    editor.innerHTML=`${items||'<div class="card"><p>保有資産がまだありません。</p></div>'}<section class="card add-asset-card"><h2>➕ 新しい銘柄を追加</h2><p class="small">シンボルでも銘柄名でも検索できます。日本株・米国株・仮想通貨をオンライン検索し、ひらがな・カタカナ・漢字・証券コードで検索できます。入力文字で始まる候補を優先表示します。</p><div class="editor-page-grid"><label>種類<select id="newAssetType"><option value="crypto">仮想通貨</option><option value="jp">日本株</option><option value="us">米国株</option></select></label><label class="asset-search-label">シンボル・銘柄検索<input id="newAssetSymbol" type="text" autocomplete="off" placeholder="あ / あい / ソフトバンク / 9984 / BTC"><div id="assetSuggestions" class="asset-suggestions hidden"></div></label><label>銘柄名<input id="newAssetName" type="text" placeholder="候補選択で自動入力"></label><label>数量・株数<input id="newAssetAmount" type="number" inputmode="decimal" step="any" min="0" placeholder="0"></label><label>平均取得単価 <span id="costUnitHint" class="field-hint">円</span><input id="newAssetCost" type="number" inputmode="decimal" step="any" min="0" placeholder="0"></label><label id="coinGeckoField">CoinGecko ID<input id="newCoinGeckoId" type="text" placeholder="候補選択で自動入力"></label><label id="yahooField" class="hidden">Yahoo Financeコード<input id="newYahooSymbol" type="text" placeholder="候補選択で自動入力"></label></div><div id="autoFillStatus" class="auto-fill-status">🔍 シンボルまたは銘柄名を入力してください</div><button id="addAssetButton" type="button" class="full-width-button">➕ 銘柄を追加</button></section>`;
    editor.querySelectorAll('[data-delete-index]').forEach(b=>b.addEventListener('click',()=>deleteAsset(Number(b.dataset.deleteIndex))));
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
function collectChanges(){ document.querySelectorAll('#editor [data-index][data-field]').forEach(input=>{ const asset=assets[Number(input.dataset.index)]; if(!asset)return; const field=input.dataset.field; asset[field]=(field==='amount'||field==='cost')?Math.max(0,Number(input.value)||0):input.value.trim(); }); }
function saveChanges(){ collectChanges(); saveAssetsToStorage(assets); transactionHistory.unshift({id:Date.now(),date:new Date().toISOString(),action:'保有資産を編集'}); saveHistoryToStorage(transactionHistory); const button=document.getElementById('saveButton'); if(button){const old=button.textContent;button.textContent='✅ 保存しました';button.disabled=true;setTimeout(()=>{button.textContent=old;button.disabled=false},1400);} let feedback=document.getElementById('saveFeedback'); if(!feedback){feedback=document.createElement('div');feedback.id='saveFeedback';feedback.className='save-feedback';document.querySelector('.sticky-save-bar')?.appendChild(feedback);} feedback.textContent='ホーム・資産ページにも保存内容が反映されました。'; renderAssetEditor(); }
function deleteAsset(index){ const asset=assets[index]; if(!asset||!confirm(`${asset.name}（${asset.symbol}）を削除しますか？`))return; assets.splice(index,1); transactionHistory.unshift({id:Date.now(),date:new Date().toISOString(),action:`${asset.name}（${asset.symbol}）を削除`}); saveAssetsToStorage(assets);saveHistoryToStorage(transactionHistory);renderAssetEditor(); }
function addAsset(){
  collectChanges();
  const type=document.getElementById('newAssetType').value;
  let symbol=normalizeSymbol(document.getElementById('newAssetSymbol').value,type);
  const auto=findMaster(symbol,type); if(auto){ applyMaster(auto,false); symbol=auto.symbol; }
  let name=document.getElementById('newAssetName').value.trim();
  const amount=Math.max(0,Number(document.getElementById('newAssetAmount').value)||0);
  const cost=Math.max(0,Number(document.getElementById('newAssetCost').value)||0);
  const coinGeckoId=document.getElementById('newCoinGeckoId').value.trim().toLowerCase();
  let yahooSymbol=document.getElementById('newYahooSymbol').value.trim().toUpperCase();
  if(type==='jp' && !yahooSymbol && symbol) yahooSymbol=`${symbol}.T`;
  if(type==='us' && !yahooSymbol && symbol) yahooSymbol=symbol;
  if(!name && type==='jp') name=`日本株 ${symbol}`;
  if(!symbol||!name)return alert('検索候補を選ぶか、シンボルと銘柄名を入力してください');
  if(assets.some(a=>a.type===type&&normalizeSymbol(a.symbol,a.type)===symbol))return alert('同じ銘柄がすでに登録されています');
  if(type==='crypto'&&!coinGeckoId)return alert('仮想通貨は検索候補を選ぶか、CoinGecko IDを入力してください');
  if(type!=='crypto'&&!yahooSymbol)return alert('Yahoo Financeコードを入力してください');
  const asset={type,symbol,name,amount,cost}; if(type==='crypto')asset.coinGeckoId=coinGeckoId;else asset.yahooSymbol=yahooSymbol;
  assets.push(asset); transactionHistory.unshift({id:Date.now(),date:new Date().toISOString(),action:`${name}（${symbol}）を追加`}); saveAssetsToStorage(assets);saveHistoryToStorage(transactionHistory);renderAssetEditor();alert(`${name}を追加しました！`);
}
document.addEventListener('DOMContentLoaded',()=>{renderAssetEditor();document.getElementById('saveButton')?.addEventListener('click',saveChanges);});
