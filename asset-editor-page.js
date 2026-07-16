// Bitcoin1070 PRO v9.1 - 銘柄かんたん追加・編集強化
const DEFAULT_ASSETS = [];
let assets = loadAssetsFromStorage(DEFAULT_ASSETS);
let transactionHistory = loadHistoryFromStorage();
const ASSET_MASTER = Array.isArray(window.B1070_ASSET_MASTER) ? window.B1070_ASSET_MASTER : [];

function escapeHtml(value) {
    return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}
function typeLabel(type){ return type==='crypto'?'仮想通貨':type==='jp'?'日本株':'米国株'; }
function normalizeSymbol(value,type){
    let symbol=String(value||'').trim().toUpperCase();
    if(type==='jp') symbol=symbol.replace(/\.T$/i,'');
    return symbol;
}
function findMaster(query,type){
    const q=String(query||'').trim().toLowerCase();
    if(!q) return null;
    return ASSET_MASTER.find(item => item.type===type && [item.symbol,item.name,item.yahooSymbol,item.coinGeckoId,...(item.keywords||[])].some(v=>String(v||'').toLowerCase()===q)) ||
      ASSET_MASTER.find(item => item.type===type && [item.symbol,item.name,item.yahooSymbol,item.coinGeckoId,...(item.keywords||[])].some(v=>String(v||'').toLowerCase().includes(q)));
}
function getSuggestions(query,type){
    const q=String(query||'').trim().toLowerCase();
    if(!q) return ASSET_MASTER.filter(item=>item.type===type).slice(0,6);
    return ASSET_MASTER.filter(item=>item.type===type && [item.symbol,item.name,item.yahooSymbol,item.coinGeckoId,...(item.keywords||[])].some(v=>String(v||'').toLowerCase().includes(q))).slice(0,8);
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
    editor.innerHTML=`${items||'<div class="card"><p>保有資産がまだありません。</p></div>'}<section class="card add-asset-card"><h2>➕ 新しい銘柄を追加</h2><p class="small">種類を選び、シンボルまたは銘柄名を入力すると候補が表示されます。</p><div class="editor-page-grid"><label>種類<select id="newAssetType"><option value="crypto">仮想通貨</option><option value="jp">日本株</option><option value="us">米国株</option></select></label><label class="asset-search-label">シンボル・銘柄検索<input id="newAssetSymbol" type="text" autocomplete="off" placeholder="BTC / 285A / NVDA / キオクシア"><div id="assetSuggestions" class="asset-suggestions hidden"></div></label><label>銘柄名<input id="newAssetName" type="text" placeholder="候補選択で自動入力"></label><label>数量・株数<input id="newAssetAmount" type="number" inputmode="decimal" step="any" min="0" placeholder="0"></label><label>平均取得単価 <span id="costUnitHint" class="field-hint">円</span><input id="newAssetCost" type="number" inputmode="decimal" step="any" min="0" placeholder="0"></label><label id="coinGeckoField">CoinGecko ID<input id="newCoinGeckoId" type="text" placeholder="候補選択で自動入力"></label><label id="yahooField" class="hidden">Yahoo Financeコード<input id="newYahooSymbol" type="text" placeholder="候補選択で自動入力"></label></div><div id="autoFillStatus" class="auto-fill-status">💡 例：日本株で「285A」→ キオクシアホールディングス／285A.T</div><button id="addAssetButton" type="button" class="full-width-button">➕ 銘柄を追加</button></section>`;
    editor.querySelectorAll('[data-delete-index]').forEach(b=>b.addEventListener('click',()=>deleteAsset(Number(b.dataset.deleteIndex))));
    bindAddForm();
}
function bindAddForm(){
  const type=document.getElementById('newAssetType'), input=document.getElementById('newAssetSymbol');
  type?.addEventListener('change',()=>{ updateTypeFields(); clearAutoFields(); showSuggestions(); });
  input?.addEventListener('input',()=>{ const hit=findMaster(input.value,type.value); if(hit && normalizeSymbol(input.value,type.value)===hit.symbol) applyMaster(hit,false); showSuggestions(); });
  input?.addEventListener('focus',showSuggestions);
  document.addEventListener('click',e=>{ if(!e.target.closest('.asset-search-label')) document.getElementById('assetSuggestions')?.classList.add('hidden'); },{once:true});
  document.getElementById('addAssetButton')?.addEventListener('click',addAsset);
  updateTypeFields();
}
function updateTypeFields(){
  const type=document.getElementById('newAssetType')?.value;
  document.getElementById('coinGeckoField')?.classList.toggle('hidden',type!=='crypto');
  document.getElementById('yahooField')?.classList.toggle('hidden',type==='crypto');
  const hint=document.getElementById('costUnitHint'); if(hint) hint.textContent=type==='us'?'ドル':'円';
}
function clearAutoFields(){ ['newAssetName','newCoinGeckoId','newYahooSymbol'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; }); }
function showSuggestions(){
  const box=document.getElementById('assetSuggestions'), input=document.getElementById('newAssetSymbol'), type=document.getElementById('newAssetType')?.value; if(!box||!input) return;
  const list=getSuggestions(input.value,type); box.innerHTML=list.map(item=>`<button type="button" class="asset-suggestion" data-symbol="${escapeHtml(item.symbol)}"><strong>${escapeHtml(item.symbol)}</strong><span>${escapeHtml(item.name)}</span><small>${escapeHtml(item.coinGeckoId||item.yahooSymbol||'')}</small></button>`).join('')||'<div class="empty-suggestion">候補なし。手入力でも登録できます。</div>';
  box.classList.remove('hidden'); box.querySelectorAll('[data-symbol]').forEach(btn=>btn.addEventListener('click',()=>{ const item=ASSET_MASTER.find(x=>x.type===type&&x.symbol===btn.dataset.symbol); if(item) applyMaster(item,true); }));
}
function applyMaster(item,close){
  document.getElementById('newAssetSymbol').value=item.symbol;
  document.getElementById('newAssetName').value=item.name;
  document.getElementById('newCoinGeckoId').value=item.coinGeckoId||'';
  document.getElementById('newYahooSymbol').value=item.yahooSymbol||'';
  const status=document.getElementById('autoFillStatus'); if(status) status.textContent=`✅ ${item.name} のコードを自動入力しました`;
  if(close) document.getElementById('assetSuggestions')?.classList.add('hidden');
}
function collectChanges(){ document.querySelectorAll('#editor [data-index][data-field]').forEach(input=>{ const asset=assets[Number(input.dataset.index)]; if(!asset)return; const field=input.dataset.field; asset[field]=(field==='amount'||field==='cost')?Math.max(0,Number(input.value)||0):input.value.trim(); }); }
function saveChanges(){ collectChanges(); saveAssetsToStorage(assets); transactionHistory.unshift({id:Date.now(),date:new Date().toISOString(),action:'保有資産を編集'}); saveHistoryToStorage(transactionHistory); const button=document.getElementById('saveButton'); if(button){const old=button.textContent;button.textContent='✅ 保存しました';button.disabled=true;setTimeout(()=>{button.textContent=old;button.disabled=false},1400);} let feedback=document.getElementById('saveFeedback'); if(!feedback){feedback=document.createElement('div');feedback.id='saveFeedback';feedback.className='save-feedback';document.querySelector('.sticky-save-bar')?.appendChild(feedback);} feedback.textContent='ホーム・資産ページにも保存内容が反映されました。'; renderAssetEditor(); }
function deleteAsset(index){ const asset=assets[index]; if(!asset||!confirm(`${asset.name}（${asset.symbol}）を削除しますか？`))return; assets.splice(index,1); transactionHistory.unshift({id:Date.now(),date:new Date().toISOString(),action:`${asset.name}（${asset.symbol}）を削除`}); saveAssetsToStorage(assets);saveHistoryToStorage(transactionHistory);renderAssetEditor(); }
function addAsset(){
  collectChanges(); const type=document.getElementById('newAssetType').value; let symbol=normalizeSymbol(document.getElementById('newAssetSymbol').value,type); const auto=findMaster(symbol,type); if(auto) applyMaster(auto,false);
  const name=document.getElementById('newAssetName').value.trim(), amount=Math.max(0,Number(document.getElementById('newAssetAmount').value)||0), cost=Math.max(0,Number(document.getElementById('newAssetCost').value)||0), coinGeckoId=document.getElementById('newCoinGeckoId').value.trim().toLowerCase(), yahooSymbol=document.getElementById('newYahooSymbol').value.trim().toUpperCase();
  if(!symbol||!name)return alert('シンボルと銘柄名を入力してください');
  if(assets.some(a=>a.type===type&&normalizeSymbol(a.symbol,a.type)===symbol))return alert('同じ銘柄がすでに登録されています');
  if(type==='crypto'&&!coinGeckoId)return alert('候補を選ぶか、CoinGecko IDを入力してください');
  if(type!=='crypto'&&!yahooSymbol)return alert('候補を選ぶか、Yahoo Financeコードを入力してください');
  const asset={type,symbol,name,amount,cost}; if(type==='crypto')asset.coinGeckoId=coinGeckoId;else asset.yahooSymbol=yahooSymbol;
  assets.push(asset); transactionHistory.unshift({id:Date.now(),date:new Date().toISOString(),action:`${name}（${symbol}）を追加`}); saveAssetsToStorage(assets);saveHistoryToStorage(transactionHistory);renderAssetEditor();alert(`${name}を追加しました！`);
}
document.addEventListener('DOMContentLoaded',()=>{renderAssetEditor();document.getElementById('saveButton')?.addEventListener('click',saveChanges);});
