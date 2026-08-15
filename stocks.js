// Bitcoin1070 PRO v12.2 - Stock Manager (safe cache / partial response)
const STOCK_API_URL = "https://bitcoin1070-api.531unchi.workers.dev";
const STOCK_CACHE_KEY = "bitcoin1070_stock_prices_v12_2";
const STOCK_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const DEFAULT_YAHOO_SYMBOLS = { NVDA:"NVDA", MHI:"7011.T", ADVT:"6857.T", FJK:"5803.T", VRAIN:"135A.T" };
let stockPrices = {};
let stockPricesUpdatedAt = null;
let stockRefreshState = { status:"idle", errors:[], updatedAt:null, missing:[] };

function validStockNumber(value){ const n=Number(value); return Number.isFinite(n)&&n>0?n:null; }
function loadStockCache(){
  try {
    const raw=JSON.parse(localStorage.getItem(STOCK_CACHE_KEY)||"null");
    if(!raw||typeof raw!=="object") return;
    const now=Date.now(), prices={}, timestamps=raw.timestamps||{};
    Object.entries(raw.prices||{}).forEach(([k,v])=>{
      const n=validStockNumber(v), ts=Date.parse(timestamps[k]||raw.fetchedAt||0);
      if(n && Number.isFinite(ts) && now-ts<STOCK_CACHE_MAX_AGE_MS) prices[k]=n;
    });
    stockPrices=prices; stockPricesUpdatedAt=raw.fetchedAt||null;
    if(Object.keys(prices).length) stockRefreshState={status:"cached",errors:[],updatedAt:stockPricesUpdatedAt,missing:[]};
  } catch(e){ console.warn("株価キャッシュ読込失敗",e); }
}
function saveStockCache(prices,timestamps,fetchedAt){
  try{localStorage.setItem(STOCK_CACHE_KEY,JSON.stringify({prices,timestamps,fetchedAt}));}catch(e){console.warn("株価キャッシュ保存失敗",e);}
}
function createRequestedStockSymbols(){
  const requested={};
  const source=(typeof assets!=="undefined"&&Array.isArray(assets))?assets:[];
  source.forEach(asset=>{
    if(asset.type!=="jp"&&asset.type!=="us") return;
    const key=String(asset.symbol||"").trim().toUpperCase(); if(!key)return;
    let yahoo=String(asset.yahooSymbol||"").trim()||DEFAULT_YAHOO_SYMBOLS[key]||"";
    if(!yahoo&&asset.type==="us") yahoo=key;
    if(yahoo) requested[key]=yahoo;
  });
  return requested;
}
function createStockApiUrl(){
  const requested=createRequestedStockSymbols();
  const symbols=Object.entries(requested).map(([k,v])=>`${encodeURIComponent(k)}:${encodeURIComponent(v)}`).join(",");
  return symbols?`${STOCK_API_URL}?symbols=${symbols}&t=${Date.now()}`:`${STOCK_API_URL}?t=${Date.now()}`;
}
async function fetchWithTimeout(url,ms=9000){
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),ms);
  try{const r=await fetch(url,{method:"GET",cache:"no-store",signal:controller.signal});if(!r.ok)throw new Error(`株価APIエラー：${r.status}`);return await r.json();}
  finally{clearTimeout(timer);}
}
async function refreshStockPrices(){
  const requested=createRequestedStockSymbols();
  const expected=[...Object.keys(requested)];
  if(expected.some(k=>{const a=(typeof assets!=="undefined"?assets:[]).find(x=>String(x.symbol||"").toUpperCase()===k);return a?.type==="us";})) expected.push("USDJPY");
  stockRefreshState={status:"loading",errors:[],updatedAt:stockPricesUpdatedAt,missing:[]};
  try{
    const data=await fetchWithTimeout(createStockApiUrl());
    if(data?.error) throw new Error(String(data.error));
    const errors=Array.isArray(data?.errors)?data.errors:(data?.errors?[data.errors]:[]);
    const nowIso=data?.fetchedAt||new Date().toISOString(), oldRaw=(()=>{try{return JSON.parse(localStorage.getItem(STOCK_CACHE_KEY)||"null")||{}}catch(_){return{}}})();
    const timestamps={...(oldRaw.timestamps||{})}, merged={...stockPrices}; let count=0;
    expected.forEach(key=>{const n=validStockNumber(data?.[key]);if(n){merged[key]=n;timestamps[key]=nowIso;count++;}});
    if(count===0) throw new Error("株価APIは有効な価格を返しませんでした");
    stockPrices=merged; stockPricesUpdatedAt=nowIso; saveStockCache(stockPrices,timestamps,nowIso);
    const missing=expected.filter(k=>!validStockNumber(data?.[k]));
    stockRefreshState={status:(missing.length||errors.length)?"partial":"success",errors:errors.map(String),updatedAt:nowIso,missing};
    return stockPrices;
  }catch(error){
    stockRefreshState={status:"error",errors:[String(error?.message||error)],updatedAt:stockPricesUpdatedAt,missing:expected};
    console.error("株価取得失敗:",error); return stockPrices;
  }
}
async function initializeStockPrices(){ await refreshStockPrices(); if(typeof loadMarketData==="function") await loadMarketData(); }
async function reloadStockPrices(){
  await initializeStockPrices();
  if(stockRefreshState.status==="success") alert("最新の株価へ更新しました");
  else if(stockRefreshState.status==="partial") alert("一部の株価のみ更新しました。未取得銘柄は有効期限内のキャッシュを使用します。");
  else alert("株価を更新できませんでした。有効期限内のキャッシュがある場合のみ表示します。");
}
loadStockCache();
document.addEventListener("DOMContentLoaded",()=>{initializeStockPrices().catch(console.error);setInterval(()=>initializeStockPrices().catch(console.error),5*60*1000);});
