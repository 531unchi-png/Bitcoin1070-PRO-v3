// Bitcoin1070 PRO v12.4 - shared asset search (local-first / online expansion)
(function(global){
  const API_URL="https://bitcoin1070-api.531unchi.workers.dev";
  const TYPES={jp:"日本株",us:"米国株",crypto:"仮想通貨"};
  const kataToHira=value=>String(value||"").replace(/[ァ-ヶ]/g,ch=>String.fromCharCode(ch.charCodeAt(0)-0x60));
  function normalize(value){return kataToHira(String(value||"").normalize("NFKC").toLowerCase()).replace(/[\s・･,.，。()（）\-ー]/g,"");}
  function values(item){return [item.symbol,item.name,item.reading,item.yahooSymbol,item.coinGeckoId,...(item.keywords||[])].map(normalize).filter(Boolean);}
  function rank(item,query){
    const q=normalize(query),symbol=normalize(item.symbol),name=normalize(item.name),reading=normalize(item.reading),all=values(item);
    if(!q)return 8;
    if(all.some(value=>value===q))return 0;
    if(symbol.startsWith(q))return 1;
    if(name.startsWith(q))return 2;
    if(reading.startsWith(q)||(item.keywords||[]).some(value=>normalize(value).startsWith(q)))return 3;
    if(all.some(value=>value.includes(q)))return 4;
    return 9;
  }
  function canonical(item){
    if(!item||!TYPES[item.type]||!item.symbol||!item.name)return null;
    const symbol=String(item.symbol).normalize("NFKC").trim().toUpperCase().replace(item.type==="jp"?/\.T$/i:/$^/,"");
    return {...item,symbol,name:String(item.name).trim(),...(item.type==="jp"?{yahooSymbol:item.yahooSymbol||`${symbol}.T`}:item.type==="us"?{yahooSymbol:item.yahooSymbol||symbol}:{})};
  }
  function unique(items){const seen=new Set();return items.map(canonical).filter(Boolean).filter(item=>{const key=`${item.type}:${item.coinGeckoId||item.yahooSymbol||item.symbol}`;if(seen.has(key))return false;seen.add(key);return true;});}
  function localCatalog(holdings=[]){return unique([...(holdings||[]),...(Array.isArray(global.B1070_ASSET_MASTER)?global.B1070_ASSET_MASTER:[])]);}
  function sortMatches(items,query,type){return unique(items).filter(item=>rank(item,query)<9).sort((a,b)=>rank(a,query)-rank(b,query)+(a.type===type?-0.25:0)-(b.type===type?-0.25:0)||normalize(a.reading||a.name).localeCompare(normalize(b.reading||b.name),"ja")||a.symbol.localeCompare(b.symbol));}
  async function search(query,{type,holdings=[],sellOnly=false,signal}={}){
    const q=String(query||"").trim();if(!q)return {items:[],offline:false};
    const held=unique(holdings).filter(item=>Number(item.amount)>0),base=sellOnly?held:localCatalog(holdings);
    let items=sortMatches(base,q,type);
    if(sellOnly)return {items:items.slice(0,50),offline:false};
    try{
      const url=`${API_URL}?mode=asset-search&q=${encodeURIComponent(q)}${type?`&type=${encodeURIComponent(type)}`:""}`;
      const response=await fetch(url,{cache:"no-store",signal});if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json();items=sortMatches([...base,...(Array.isArray(data.results)?data.results:[])],q,type);
      return {items:items.slice(0,50),offline:false};
    }catch(error){if(error?.name==="AbortError")throw error;return {items:items.slice(0,50),offline:true};}
  }
  global.B1070AssetSearch={normalize,rank,unique,localCatalog,sortMatches,search,typeLabel:type=>TYPES[type]||type};
})(typeof window!=="undefined"?window:globalThis);
