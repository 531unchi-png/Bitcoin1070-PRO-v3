// Bitcoin1070 PRO v16.0.2 - background technical loader for Investment OS
(()=>{
'use strict';
let running=false;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function load(){
 if(running||typeof window.analyzeTechnicalAsset!=='function')return;
 const center=window.Bitcoin1070DecisionCenter;
 const data=window.Bitcoin1070DataLayer;
 const holdings=center?.holdings?.()||[];
 if(!holdings.length)return;
 running=true;
 try{
  for(const asset of holdings){
   if(asset?.type==='cash')continue;
   const existing=data?.getTechnical?.(asset);
   if(existing&&!existing.stale)continue;
   try{await window.analyzeTechnicalAsset(asset)}catch(e){console.warn('[Investment OS] technical unavailable',asset?.symbol,e?.message||e)}
   await sleep(120);
  }
 }finally{
  running=false;
  window.dispatchEvent(new CustomEvent('bitcoin1070:technical-autoload-complete'));
 }
}
window.Bitcoin1070TechnicalAutoload={load,version:'16.0.2'};
document.addEventListener('DOMContentLoaded',()=>setTimeout(load,900));
window.addEventListener('b1070:market-updated',()=>setTimeout(load,300));
})();
