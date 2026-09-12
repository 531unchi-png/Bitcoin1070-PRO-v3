// Bitcoin1070 PRO v17.0 - investment utility engine
(()=>{'use strict';
const SNAPSHOT_KEY='bitcoin1070_v17_asset_snapshots';
const n=v=>{if(v===null||v===undefined||v==='')return null;const x=Number(v);return Number.isFinite(x)?x:null};
const assets=()=>typeof loadAssetsFromStorage==='function'?loadAssetsFromStorage(window.DEFAULT_ASSETS||[]):[];
const cash=()=>typeof loadCashBalance==='function'?loadCashBalance():0;
function unitCostJpy(a,fx){if(typeof assetUnitCostJpy==='function')return assetUnitCostJpy(a);const c=n(a?.cost);if(c===null)return null;return a.type==='us'?c*(n(a.acquisitionUsdJpy)||fx||0):c;}
function buySimulation({symbol,budgetJpy,price,usdJpy}){const list=assets(),a=list.find(x=>String(x.symbol).toUpperCase()===String(symbol).toUpperCase());if(!a)return{ok:false,error:'銘柄が見つかりません'};const budget=n(budgetJpy),p=n(price),fx=a.type==='us'?n(usdJpy):1;if(!budget||budget<=0||!p||p<=0||(a.type==='us'&&(!fx||fx<=0)))return{ok:false,error:'金額・価格・為替を確認してください'};const unitJpy=p*fx,qty=budget/unitJpy,oldQty=n(a.amount)||0,oldCost=unitCostJpy(a,fx),newQty=oldQty+qty,newCost=oldCost===null?unitJpy:(oldCost*oldQty+budget)/newQty;return{ok:true,asset:a,purchaseQuantity:qty,newQuantity:newQty,newAverageCostJpy:newCost,budgetJpy:budget,unitPriceJpy:unitJpy,readOnly:true};}
function fxSimulation({usdJpy,usPrices={}}){const fx=n(usdJpy);if(!fx||fx<=0)return{ok:false,error:'ドル円を入力してください'};let usValue=0;const rows=assets().filter(a=>a.type==='us').map(a=>{const price=n(usPrices[a.symbol]);if(price===null)return{symbol:a.symbol,status:'missing',valueJpy:null};const valueJpy=(n(a.amount)||0)*price*fx;usValue+=valueJpy;return{symbol:a.symbol,status:'ok',valueJpy,priceUsd:price,usdJpy:fx}});return{ok:true,usdJpy:fx,usValueJpy:usValue,cashJpy:cash(),rows};}
function saveSnapshot(snapshot){const row={id:`${Date.now()}`,createdAt:new Date().toISOString(),...snapshot};let all=[];try{all=JSON.parse(localStorage.getItem(SNAPSHOT_KEY)||'[]');if(!Array.isArray(all))all=[]}catch(_){}all.unshift(row);all=all.slice(0,730);localStorage.setItem(SNAPSHOT_KEY,JSON.stringify(all));return row;}
function snapshots(){try{const x=JSON.parse(localStorage.getItem(SNAPSHOT_KEY)||'[]');return Array.isArray(x)?x:[]}catch(_){return[]}}
function normalizedReturn(start,end){const s=n(start),e=n(end);return s&&e?(e/s-1)*100:null;}
window.Bitcoin1070InvestmentTools={buySimulation,fxSimulation,saveSnapshot,snapshots,normalizedReturn,keys:{snapshots:SNAPSHOT_KEY},version:'17.0'};
})();