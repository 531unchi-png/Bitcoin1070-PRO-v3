// Bitcoin1070 PRO v13.0 - Storage Manager (backward compatible / validated restore)
const STORAGE_KEYS={ASSETS:"bitcoin1070_v3_assets",HISTORY:"bitcoin1070_v3_history",TRANSACTIONS:"bitcoin1070_v12_3_transactions"};
const CASH_STORAGE_KEY="bitcoin1070_v12_1_cash_jpy";
const BACKUP_SCHEMA_VERSION=5;
const DEMO_STORAGE_PREFIX="bitcoin1070_demo_v13::";
function isDemoMode(){try{return sessionStorage.getItem("bitcoin1070_v13_demo")==="1";}catch(_){return false;}}
function activeStorageKey(key){return isDemoMode()?DEMO_STORAGE_PREFIX+key:key;}
const DEMO_DATA_MANAGEMENT_MESSAGE="デモモード中はデータ管理操作を利用できません。デモを終了してから操作してください。";
function canUseDataManagement(){return !isDemoMode();}
function requireDataManagement(){if(!canUseDataManagement())throw new Error(DEMO_DATA_MANAGEMENT_MESSAGE);return true;}
function cloneValue(v){return typeof structuredClone==="function"?structuredClone(v):JSON.parse(JSON.stringify(v));}
function saveAssetsToStorage(assets){localStorage.setItem(activeStorageKey(STORAGE_KEYS.ASSETS),JSON.stringify(assets));}
function loadAssetsFromStorage(defaultAssets){try{const saved=localStorage.getItem(activeStorageKey(STORAGE_KEYS.ASSETS));if(!saved)return cloneValue(defaultAssets);const parsed=JSON.parse(saved);return Array.isArray(parsed)?parsed:cloneValue(defaultAssets);}catch(e){console.error("資産データ読込エラー:",e);return cloneValue(defaultAssets);}}
function saveHistoryToStorage(history){localStorage.setItem(activeStorageKey(STORAGE_KEYS.HISTORY),JSON.stringify(history));}
function loadHistoryFromStorage(){try{const saved=localStorage.getItem(activeStorageKey(STORAGE_KEYS.HISTORY));if(!saved)return[];const parsed=JSON.parse(saved);return Array.isArray(parsed)?parsed:[];}catch(e){console.error("履歴読込エラー:",e);return[];}}
function loadCashBalance(){try{const v=Number(localStorage.getItem(activeStorageKey(CASH_STORAGE_KEY))||0);return Number.isFinite(v)&&v>=0?v:0;}catch(_){return 0;}}
function saveCashBalance(value){const n=Number(value);if(!Number.isFinite(n)||n<0)throw new Error("日本円残高が不正です");localStorage.setItem(activeStorageKey(CASH_STORAGE_KEY),String(n));return n;}
function safeString(value,name,max=120){if(typeof value!=="string"||!value.trim()||/[\u0000-\u001F\u007F]/.test(value)||value.length>max)throw new Error(`${name}が不正です`);return value.trim();}
function safeNumber(value,name,{nullable=false,positive=false}={}){if(nullable&&(value===null||value===undefined||value===""))return null;if(typeof value==="boolean"||value===null||value===undefined||value==="")throw new Error(`${name}が不正です`);const n=Number(value);if(!Number.isFinite(n)||n<0||(positive&&n<=0))throw new Error(`${name}が不正です`);return n;}
function sanitizeAsset(asset){if(!asset||typeof asset!=="object")throw new Error("資産データが不正です");const type=safeString(asset.type,"type",20);if(!["crypto","jp","us"].includes(type))throw new Error("資産typeが不正です");const out={type,name:safeString(asset.name,"name",120),symbol:safeString(asset.symbol,"symbol",40),amount:safeNumber(asset.amount,"amount"),cost:safeNumber(asset.cost,"cost",{nullable:true})};if(asset.coinGeckoId!=null&&asset.coinGeckoId!=="")out.coinGeckoId=safeString(asset.coinGeckoId,"coinGeckoId",120);if(asset.yahooSymbol!=null&&asset.yahooSymbol!=="")out.yahooSymbol=safeString(asset.yahooSymbol,"yahooSymbol",80);if(asset.costJpy!=null&&asset.costJpy!=="")out.costJpy=safeNumber(asset.costJpy,"costJpy");if(asset.acquisitionUsdJpy!=null&&asset.acquisitionUsdJpy!=="")out.acquisitionUsdJpy=safeNumber(asset.acquisitionUsdJpy,"acquisitionUsdJpy");return out;}
function sanitizeHistory(history){if(!Array.isArray(history))return[];return history.slice(0,5000).map((h,i)=>{if(!h||typeof h!=="object")throw new Error(`履歴${i+1}が不正です`);const out={};if(h.id!=null)out.id=safeNumber(h.id,"history.id");if(h.date!=null)out.date=safeString(h.date,"history.date",80);if(h.action!=null)out.action=safeString(h.action,"history.action",500);return out;});}
function sanitizeTransaction(item,index=0){
  if(!item||typeof item!=="object")throw new Error(`取引履歴${index+1}が不正です`);
  const kind=safeString(item.kind,"transaction.kind",20);
  if(!["BUY","SELL","DEPOSIT","WITHDRAWAL"].includes(kind))throw new Error("取引種別が不正です");
  const out={id:safeString(String(item.id),"transaction.id",80),date:safeString(item.date,"transaction.date",80),kind,totalJpy:safeNumber(item.totalJpy,"transaction.totalJpy"),cashDelta:safeNumber(Math.abs(Number(item.cashDelta)),"transaction.cashDelta")*(Number(item.cashDelta)<0?-1:1)};
  if(kind==="BUY"||kind==="SELL"){
    out.type=safeString(item.type,"transaction.type",20);if(!["crypto","jp","us"].includes(out.type))throw new Error("取引typeが不正です");
    out.symbol=safeString(item.symbol,"transaction.symbol",40);out.name=safeString(item.name,"transaction.name",120);
    out.quantity=safeNumber(item.quantity,"transaction.quantity",{positive:true});out.unitPrice=safeNumber(item.unitPrice,"transaction.unitPrice",{positive:true});
    out.fxRate=safeNumber(item.fxRate??1,"transaction.fxRate",{positive:true});out.feeJpy=safeNumber(item.feeJpy??0,"transaction.feeJpy");out.costBasisJpy=safeNumber(item.costBasisJpy??0,"transaction.costBasisJpy");
  }
  return out;
}
function loadTransactionsFromStorage(){try{const raw=localStorage.getItem(activeStorageKey(STORAGE_KEYS.TRANSACTIONS));if(!raw)return[];const data=JSON.parse(raw);return Array.isArray(data)?data.map(sanitizeTransaction):[];}catch(e){console.error("取引台帳読込エラー:",e);return[];}}
function saveTransactionsToStorage(items){const clean=items.slice(0,5000).map(sanitizeTransaction);localStorage.setItem(activeStorageKey(STORAGE_KEYS.TRANSACTIONS),JSON.stringify(clean));return clean;}
function assetUnitCostJpy(asset){if(asset.cost===null||asset.cost===undefined||asset.cost==="")return null;if(asset.type==="us"){const jpy=Number(asset.costJpy);if(Number.isFinite(jpy))return jpy;const fx=Number(asset.acquisitionUsdJpy);return Number.isFinite(fx)&&fx>0?Number(asset.cost)*fx:null;}return Number(asset.cost);}
function createLedgerEntry(input,currentCash){
  const kind=safeString(input.kind,"種別",20),date=new Date(input.date).toISOString(),id=`${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
  if(!["BUY","SELL","DEPOSIT","WITHDRAWAL"].includes(kind)||!Number.isFinite(Date.parse(date)))throw new Error("取引内容が不正です");
  if(kind==="DEPOSIT"||kind==="WITHDRAWAL"){
    const amount=safeNumber(input.amount,"金額",{positive:true});
    if(kind==="WITHDRAWAL"&&amount>currentCash)throw new Error("日本円残高を超えて出金できません");
    return {id,date,kind,totalJpy:amount,cashDelta:kind==="DEPOSIT"?amount:-amount};
  }
  const type=safeString(input.type,"種類",20),symbol=safeString(input.symbol,"銘柄",40).toUpperCase(),name=safeString(input.name,"銘柄名",120);
  if(!["crypto","jp","us"].includes(type))throw new Error("種類が不正です");
  const quantity=safeNumber(input.quantity,"数量",{positive:true}),unitPrice=safeNumber(input.unitPrice,"約定単価",{positive:true}),fxRate=type==="us"?safeNumber(input.fxRate,"USD/JPY",{positive:true}):1,feeJpy=safeNumber(input.feeJpy??0,"手数料");
  const gross=quantity*unitPrice*fxRate,totalJpy=kind==="BUY"?gross+feeJpy:gross-feeJpy;
  if(totalJpy<=0)throw new Error("取引総額が不正です");
  if(kind==="BUY"&&totalJpy>currentCash)throw new Error("日本円残高が不足しています");
  return {id,date,kind,type,symbol,name,quantity,unitPrice,fxRate,feeJpy,totalJpy,cashDelta:kind==="BUY"?-totalJpy:totalJpy,costBasisJpy:0};
}
function applyLedgerTransaction(currentAssets,currentCash,input){
  const assets=currentAssets.map(sanitizeAsset),entry=createLedgerEntry(input,currentCash);let cash=Number(currentCash);
  if(entry.kind==="DEPOSIT"||entry.kind==="WITHDRAWAL")return {assets,cashBalance:cash+entry.cashDelta,entry};
  const index=assets.findIndex(a=>a.type===entry.type&&String(a.symbol).toUpperCase()===entry.symbol);let asset=index>=0?assets[index]:null;
  if(entry.kind==="SELL"&&(!asset||entry.quantity>Number(asset.amount)+1e-12))throw new Error("保有数量を超えて売却できません");
  if(!asset){asset=sanitizeAsset({type:entry.type,symbol:entry.symbol,name:entry.name,amount:0,cost:null,...(input.coinGeckoId?{coinGeckoId:input.coinGeckoId}:{}),...(input.yahooSymbol?{yahooSymbol:input.yahooSymbol}:{})});assets.push(asset);}
  const oldAmount=Number(asset.amount),unitCostJpy=assetUnitCostJpy(asset);
  if(entry.kind==="BUY"){
    const nextAmount=oldAmount+entry.quantity;
    if(unitCostJpy!==null){const nextUnitJpy=(unitCostJpy*oldAmount+entry.totalJpy)/nextAmount;if(entry.type==="us"){asset.cost=(Number(asset.cost)*oldAmount+entry.unitPrice*entry.quantity)/nextAmount;asset.costJpy=nextUnitJpy;asset.acquisitionUsdJpy=asset.cost>0?nextUnitJpy/asset.cost:entry.fxRate;}else asset.cost=nextUnitJpy;}
    else if(oldAmount===0){asset.cost=entry.unitPrice+(entry.type==="us"?0:entry.feeJpy/entry.quantity);if(entry.type==="us"){asset.costJpy=entry.totalJpy/entry.quantity;asset.acquisitionUsdJpy=asset.costJpy/asset.cost;}}
    asset.amount=nextAmount;
  }else{entry.costBasisJpy=unitCostJpy===null?0:unitCostJpy*entry.quantity;asset.amount=Math.max(0,oldAmount-entry.quantity);}
  cash+=entry.cashDelta;if(cash<0)throw new Error("日本円残高が不正です");return {assets,cashBalance:cash,entry};
}
function commitLedgerTransaction(input){const result=applyLedgerTransaction(loadAssetsFromStorage([]),loadCashBalance(),input),items=loadTransactionsFromStorage();saveAssetsToStorage(result.assets);saveCashBalance(result.cashBalance);saveTransactionsToStorage([result.entry,...items]);return result;}
function exportAppData(assets,history){const backup={schemaVersion:BACKUP_SCHEMA_VERSION,version:"13.0",exportedAt:new Date().toISOString(),cashBalance:loadCashBalance(),assets,history,transactions:loadTransactionsFromStorage()};const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=`bitcoin1070-backup-${Date.now()}.json`;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);}
function backupSummary(data){return {version:String(data.version||"不明"),schemaVersion:data.schemaVersion??"旧形式",exportedAt:data.exportedAt||null,assetCount:Array.isArray(data.assets)?data.assets.length:0,transactionCount:Array.isArray(data.transactions)?data.transactions.length:0,cashBalance:Number(data.cashBalance||0)};}
function importAppData(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result),schema=data.schemaVersion;if(schema!==undefined&&![4,5].includes(schema))throw new Error(`未対応のバックアップ形式です (schemaVersion: ${schema})`);if(!Array.isArray(data.assets))throw new Error("資産データの形式が不正です");const assets=data.assets.map(sanitizeAsset),history=sanitizeHistory(data.history),transactions=Array.isArray(data.transactions)?data.transactions.map(sanitizeTransaction):[];let cashBalance=null;if(data.cashBalance!=null)cashBalance=safeNumber(data.cashBalance,"cashBalance");resolve({assets,history,cashBalance,transactions,metadata:backupSummary(data)});}catch(e){reject(e);}};reader.onerror=()=>reject(new Error("ファイルの読み込みに失敗しました"));reader.readAsText(file);});}
function resetAppStorage(){localStorage.removeItem(activeStorageKey(STORAGE_KEYS.ASSETS));localStorage.removeItem(activeStorageKey(STORAGE_KEYS.HISTORY));localStorage.removeItem(activeStorageKey(STORAGE_KEYS.TRANSACTIONS));localStorage.removeItem(activeStorageKey(CASH_STORAGE_KEY));}
