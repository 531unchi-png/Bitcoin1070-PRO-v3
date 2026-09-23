// Bitcoin1070 PRO v13.1 - Storage Manager (backward compatible / validated restore)
const STORAGE_KEYS={ASSETS:"bitcoin1070_v3_assets",HISTORY:"bitcoin1070_v3_history",TRANSACTIONS:"bitcoin1070_v12_3_transactions"};
const CASH_STORAGE_KEY="bitcoin1070_v12_1_cash_jpy";
const BACKUP_SCHEMA_VERSION=7;
const CRYPTO_TAX_KEY="bitcoin1070_crypto_tax_v1";
const STRATEGY_LIMITS_KEY="bitcoin1070_strategy_limits_v1",ASSET_SNAPSHOTS_KEY="bitcoin1070_v3_asset_history";
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
function sanitizeAsset(asset){if(!asset||typeof asset!=="object")throw new Error("資産データが不正です");const type=safeString(asset.type,"type",20);if(!["crypto","jp","us","fund"].includes(type))throw new Error("資産typeが不正です");const out={type,name:safeString(asset.name,"name",120),symbol:safeString(asset.symbol,"symbol",40),amount:safeNumber(asset.amount,"amount"),cost:safeNumber(asset.cost,"cost",{nullable:true})};if(asset.coinGeckoId!=null&&asset.coinGeckoId!=="")out.coinGeckoId=safeString(asset.coinGeckoId,"coinGeckoId",120);if(asset.yahooSymbol!=null&&asset.yahooSymbol!=="")out.yahooSymbol=safeString(asset.yahooSymbol,"yahooSymbol",80);if(asset.costJpy!=null&&asset.costJpy!=="")out.costJpy=safeNumber(asset.costJpy,"costJpy");if(asset.acquisitionUsdJpy!=null&&asset.acquisitionUsdJpy!=="")out.acquisitionUsdJpy=safeNumber(asset.acquisitionUsdJpy,"acquisitionUsdJpy");if(type!=="crypto")out.accountType=["nisa","taxable","unknown"].includes(asset.accountType)?asset.accountType:"unknown";if(type==="fund"){out.navJpy=safeNumber(asset.navJpy,"基準価額",{positive:true});if(!/^\d{4}-\d{2}-\d{2}$/.test(String(asset.navDate||""))||!Number.isFinite(Date.parse(`${asset.navDate}T00:00:00Z`))||asset.navDate>new Date().toISOString().slice(0,10))throw new Error("基準価額の日付が不正です");out.navDate=asset.navDate;}return out;}
function sanitizeHistory(history){if(!Array.isArray(history))return[];return history.slice(0,5000).map((h,i)=>{if(!h||typeof h!=="object")throw new Error(`履歴${i+1}が不正です`);const out={};if(h.id!=null)out.id=safeNumber(h.id,"history.id");if(h.date!=null)out.date=safeString(h.date,"history.date",80);if(h.action!=null)out.action=safeString(h.action,"history.action",500);return out;});}
function sanitizeTransaction(item,index=0){
  if(!item||typeof item!=="object")throw new Error(`取引履歴${index+1}が不正です`);
  const kind=safeString(item.kind,"transaction.kind",20);
  if(!["BUY","SELL","DEPOSIT","WITHDRAWAL"].includes(kind))throw new Error("取引種別が不正です");
  const out={id:safeString(String(item.id),"transaction.id",80),date:safeString(item.date,"transaction.date",80),kind,totalJpy:safeNumber(item.totalJpy,"transaction.totalJpy"),cashDelta:safeNumber(Math.abs(Number(item.cashDelta)),"transaction.cashDelta")*(Number(item.cashDelta)<0?-1:1)};
  if(kind==="BUY"||kind==="SELL"){
    out.type=safeString(item.type,"transaction.type",20);if(!["crypto","jp","us","fund"].includes(out.type))throw new Error("取引typeが不正です");
    out.symbol=safeString(item.symbol,"transaction.symbol",40);out.name=safeString(item.name,"transaction.name",120);
    if(item.accountType!=null)out.accountType=["nisa","taxable","unknown"].includes(item.accountType)?item.accountType:"unknown";
    out.quantity=safeNumber(item.quantity,"transaction.quantity",{positive:true});out.unitPrice=safeNumber(item.unitPrice,"transaction.unitPrice",{positive:true});
    out.fxRate=safeNumber(item.fxRate??1,"transaction.fxRate",{positive:true});out.feeJpy=safeNumber(item.feeJpy??0,"transaction.feeJpy");out.costBasisJpy=safeNumber(item.costBasisJpy,"transaction.costBasisJpy",{nullable:true});
    if(kind==="SELL"){
      out.saleProceedsJpy=safeNumber(item.saleProceedsJpy,"transaction.saleProceedsJpy",{nullable:true});
      out.realizedPnlJpy=item.realizedPnlJpy==null?null:safeNumber(Math.abs(Number(item.realizedPnlJpy)),"transaction.realizedPnlJpy")*(Number(item.realizedPnlJpy)<0?-1:1);
      out.realizedPnlRate=item.realizedPnlRate==null?null:safeNumber(Math.abs(Number(item.realizedPnlRate)),"transaction.realizedPnlRate")*(Number(item.realizedPnlRate)<0?-1:1);
      out.saleUsdJpy=safeNumber(item.saleUsdJpy,"transaction.saleUsdJpy",{nullable:true});
    }
  }
  return out;
}
function loadTransactionsFromStorage(){try{const raw=localStorage.getItem(activeStorageKey(STORAGE_KEYS.TRANSACTIONS));if(!raw)return[];const data=JSON.parse(raw);return Array.isArray(data)?data.map(sanitizeTransaction):[];}catch(e){console.error("取引台帳読込エラー:",e);return[];}}
function saveTransactionsToStorage(items){const clean=items.slice(0,5000).map(sanitizeTransaction);localStorage.setItem(activeStorageKey(STORAGE_KEYS.TRANSACTIONS),JSON.stringify(clean));return clean;}
function assetUnitCostJpy(asset){if(asset.cost===null||asset.cost===undefined||asset.cost==="")return null;if(asset.type==="us"){const jpy=Number(asset.costJpy);if(Number.isFinite(jpy))return jpy;const fx=Number(asset.acquisitionUsdJpy);return Number.isFinite(fx)&&fx>0?Number(asset.cost)*fx:null;}return Number(asset.cost);}
function assetAcquisitionValueJpy(asset){const unitCost=assetUnitCostJpy(asset),amount=Number(asset?.amount);return unitCost===null||!Number.isFinite(amount)?null:unitCost*amount;}
function setUsAssetAcquisitionFx(asset,value){
  if(!asset||asset.type!=="us")return asset;
  if(value===null||value===undefined||value===""){delete asset.acquisitionUsdJpy;delete asset.costJpy;return asset;}
  const fx=safeNumber(value,"取得時USD/JPY",{positive:true}),cost=safeNumber(asset.cost,"平均取得単価",{nullable:true});
  asset.acquisitionUsdJpy=fx;
  if(cost===null)delete asset.costJpy;else asset.costJpy=cost*fx;
  return asset;
}
function createLedgerEntry(input,currentCash){
  const kind=safeString(input.kind,"種別",20),date=new Date(input.date).toISOString(),id=`${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
  if(!["BUY","SELL","DEPOSIT","WITHDRAWAL"].includes(kind)||!Number.isFinite(Date.parse(date)))throw new Error("取引内容が不正です");
  if(kind==="DEPOSIT"||kind==="WITHDRAWAL"){
    const amount=safeNumber(input.amount,"金額",{positive:true});
    if(kind==="WITHDRAWAL"&&amount>currentCash)throw new Error("日本円残高を超えて出金できません");
    return {id,date,kind,totalJpy:amount,cashDelta:kind==="DEPOSIT"?amount:-amount};
  }
  const type=safeString(input.type,"種類",20),symbol=safeString(input.symbol,"銘柄",40).toUpperCase(),name=safeString(input.name,"銘柄名",120);
  if(!["crypto","jp","us","fund"].includes(type))throw new Error("種類が不正です");
  const quantity=safeNumber(input.quantity,"数量",{positive:true}),unitPrice=safeNumber(input.unitPrice,"約定単価",{positive:true}),fxRate=type==="us"?safeNumber(input.fxRate,"USD/JPY",{positive:true}):1,feeJpy=safeNumber(input.feeJpy??0,"手数料");
  const gross=quantity*unitPrice*fxRate/(type==="fund"?10000:1),totalJpy=kind==="BUY"?gross+feeJpy:gross-feeJpy;
  if(totalJpy<=0)throw new Error("取引総額が不正です");
  if(kind==="BUY"&&totalJpy>currentCash)throw new Error("日本円残高が不足しています");
  return {id,date,kind,type,symbol,name,quantity,unitPrice,fxRate,feeJpy,totalJpy,cashDelta:kind==="BUY"?-totalJpy:totalJpy,costBasisJpy:null,...(kind==="SELL"?{saleProceedsJpy:gross,realizedPnlJpy:null,realizedPnlRate:null,saleUsdJpy:type==="us"?fxRate:null}:{})};
}
function applyLedgerTransaction(currentAssets,currentCash,input){
  const assets=currentAssets.map(sanitizeAsset),entry=createLedgerEntry(input,currentCash);let cash=Number(currentCash);
  if(entry.kind==="DEPOSIT"||entry.kind==="WITHDRAWAL")return {assets,cashBalance:cash+entry.cashDelta,entry};
  const index=assets.findIndex(a=>a.type===entry.type&&String(a.symbol).toUpperCase()===entry.symbol);let asset=index>=0?assets[index]:null;
  if(entry.kind==="SELL"&&(!asset||entry.quantity>Number(asset.amount)+1e-12))throw new Error("保有数量を超えて売却できません");
  if(!asset){if(entry.type==="fund")throw new Error("投資信託は資産編集画面で基準価額を登録してください");asset=sanitizeAsset({type:entry.type,symbol:entry.symbol,name:entry.name,amount:0,cost:null,accountType:input.accountType,...(input.coinGeckoId?{coinGeckoId:input.coinGeckoId}:{}),...(input.yahooSymbol?{yahooSymbol:input.yahooSymbol}:{})});assets.push(asset);}
  entry.accountType=asset.accountType||"unknown";
  const oldAmount=Number(asset.amount),unitCostJpy=assetUnitCostJpy(asset);
  if(entry.kind==="BUY"){
    const nextAmount=oldAmount+entry.quantity;
    if(unitCostJpy!==null){const nextUnitJpy=(unitCostJpy*oldAmount+entry.totalJpy)/nextAmount;if(entry.type==="us"){asset.cost=(Number(asset.cost)*oldAmount+entry.unitPrice*entry.quantity)/nextAmount;asset.costJpy=nextUnitJpy;asset.acquisitionUsdJpy=asset.cost>0?nextUnitJpy/asset.cost:entry.fxRate;}else asset.cost=nextUnitJpy;}
    else if(oldAmount===0){asset.cost=entry.unitPrice/(entry.type==="fund"?10000:1)+(entry.type==="us"?0:entry.feeJpy/entry.quantity);if(entry.type==="us"){asset.costJpy=entry.totalJpy/entry.quantity;asset.acquisitionUsdJpy=asset.costJpy/asset.cost;}}
    asset.amount=nextAmount;
  }else{entry.costBasisJpy=unitCostJpy===null?null:unitCostJpy*entry.quantity;if(entry.costBasisJpy!==null){entry.realizedPnlJpy=entry.saleProceedsJpy-entry.costBasisJpy-entry.feeJpy;entry.realizedPnlRate=entry.costBasisJpy>0?entry.realizedPnlJpy/entry.costBasisJpy*100:null;}asset.amount=Math.max(0,oldAmount-entry.quantity);}
  cash+=entry.cashDelta;if(cash<0)throw new Error("日本円残高が不正です");return {assets,cashBalance:cash,entry};
}
function commitLedgerTransaction(input){const result=applyLedgerTransaction(loadAssetsFromStorage([]),loadCashBalance(),input),items=loadTransactionsFromStorage();saveAssetsToStorage(result.assets);saveCashBalance(result.cashBalance);saveTransactionsToStorage([result.entry,...items]);return result;}
function summarizeRealizedPnl(items=loadTransactionsFromStorage(),year=new Date().getFullYear()){
  const summary={year,totalPnlJpy:0,yearPnlJpy:0,sellCount:0,yearSellCount:0,profitCount:0,lossCount:0,unavailableCount:0,byAsset:[]},assets=new Map();
  items.filter(item=>item.kind==="SELL").forEach(item=>{
    const itemYear=new Date(item.date).getFullYear(),isYear=itemYear===year,pnl=Number(item.realizedPnlJpy),available=item.realizedPnlJpy!==null&&item.realizedPnlJpy!==undefined&&Number.isFinite(pnl),key=`${item.type}:${item.symbol}`;
    summary.sellCount++;if(isYear)summary.yearSellCount++;if(!available)summary.unavailableCount++;else{summary.totalPnlJpy+=pnl;if(isYear)summary.yearPnlJpy+=pnl;if(pnl>0)summary.profitCount++;else if(pnl<0)summary.lossCount++;}
    if(!assets.has(key))assets.set(key,{type:item.type,symbol:item.symbol,name:item.name,totalPnlJpy:0,yearPnlJpy:0,sellCount:0,unavailableCount:0});const asset=assets.get(key);asset.sellCount++;if(!available)asset.unavailableCount++;else{asset.totalPnlJpy+=pnl;if(isYear)asset.yearPnlJpy+=pnl;}
  });
  summary.byAsset=[...assets.values()].sort((a,b)=>Math.abs(b.totalPnlJpy)-Math.abs(a.totalPnlJpy)||a.symbol.localeCompare(b.symbol));return summary;
}
function sanitizeAssetSnapshots(value){if(!Array.isArray(value))return[];return value.slice(-1000).map((row,i)=>{if(!row||typeof row!=="object"||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!Number.isFinite(Date.parse(row.date)))throw new Error(`資産評価履歴${i+1}が不正です`);const out={date:row.date,complete:row.complete===true};for(const field of ["total","crypto","jp","us","cash","fund"])out[field]=safeNumber(field==="fund"?(row[field]??0):row[field],`資産評価履歴.${field}`);if(row.updatedAt!=null){if(typeof row.updatedAt!=="string"||!Number.isFinite(Date.parse(row.updatedAt)))throw new Error("資産評価履歴の更新日時が不正です");out.updatedAt=row.updatedAt;}return out;});}
function sanitizeStrategyLimits(value){if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("配分上限が不正です");const out={};for(const field of ["single","crypto","semi","alt","cashMin"]){const n=safeNumber(value[field],`配分上限.${field}`);if(n>100)throw new Error("配分上限は100%以下にしてください");out[field]=n;}if(typeof value.semiSymbols!=="string"||value.semiSymbols.length>500)throw new Error("半導体対象銘柄が不正です");out.semiSymbols=value.semiSymbols;return out;}
function sanitizeCryptoTaxRecords(value){
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("暗号資産税データが不正です");
  const annual=Array.isArray(value.annual)?value.annual:[],trades=Array.isArray(value.trades)?value.trades:[],openingBasis=value.openingBasis||{},baseIncome=value.baseIncome||{},coverage=value.coverage||{};
  if(annual.length>30||trades.length>25000||!openingBasis||typeof openingBasis!=="object"||Array.isArray(openingBasis)||!baseIncome||typeof baseIncome!=="object"||Array.isArray(baseIncome)||!coverage||typeof coverage!=="object"||Array.isArray(coverage))throw new Error("暗号資産税データが多すぎるか不正です");
  const fields=["opening","end","buyQty","buyJpy","sellQty","sellJpy","btcBuyQty","btcBuyJpy","btcSellQty","btcSellJpy","inQty","outQty","fee","lentQty","returnedQty","lending"];
  const cleanAnnual=annual.map(item=>{const year=safeNumber(item.year,"報告年");if(!Number.isInteger(year)||year<2018||year>2100||!Array.isArray(item.rows)||item.rows.length>200)throw new Error("年間報告書が不正です");return {year,rows:item.rows.map(row=>{const out={symbol:safeString(row.symbol,"通貨",20)};if(!/^[A-Z0-9]{2,20}$/.test(out.symbol))throw new Error("通貨が不正です");for(const key of fields)out[key]=safeNumber(row[key],key);return out;})};});
  if(new Set(cleanAnnual.map(x=>x.year)).size!==cleanAnnual.length)throw new Error("報告年が重複しています");
  const seen=new Set(),cleanTrades=trades.map(item=>{const id=safeString(item.id,"取引ID",120),pair=safeString(item.pair,"通貨ペア",40),symbol=safeString(item.symbol,"通貨",20),quote=safeString(item.quote,"建値通貨",20),date=safeString(item.date,"取引日時",40),kind=safeString(item.kind,"売買",4);if(!Number.isFinite(Date.parse(date))||!["BUY","SELL"].includes(kind)||seen.has(id))throw new Error("約定履歴が不正です");seen.add(id);const fee=Number(item.fee);if(!Number.isFinite(fee))throw new Error("手数料が不正です");return{id,pair,symbol,quote,kind,date,quantity:safeNumber(item.quantity,"数量",{positive:true}),price:safeNumber(item.price,"価格",{positive:true}),fee};});
  const cleanBasis={},cleanIncome={},cleanCoverage={};for(const [key,val]of Object.entries(openingBasis)){if(!/^20\d\d:[A-Z0-9]{2,20}$/.test(key))throw new Error("年始原価のキーが不正です");cleanBasis[key]=safeNumber(val,"年始取得原価");}for(const [key,val]of Object.entries(baseIncome)){if(!/^20\d\d$/.test(key))throw new Error("課税所得の年が不正です");cleanIncome[key]=safeNumber(val,"課税所得");}for(const [key,val]of Object.entries(coverage)){if(!/^20\d\d$/.test(key)||typeof val!=="boolean")throw new Error("取引網羅性が不正です");cleanCoverage[key]=val;}return{annual:cleanAnnual,trades:cleanTrades,openingBasis:cleanBasis,baseIncome:cleanIncome,coverage:cleanCoverage};
}
function loadCryptoTaxRecords(){try{const raw=localStorage.getItem(activeStorageKey(CRYPTO_TAX_KEY));return raw?sanitizeCryptoTaxRecords(JSON.parse(raw)):{annual:[],trades:[],openingBasis:{},baseIncome:{},coverage:{}};}catch(error){console.error("暗号資産税データ読込エラー",error);throw error;}}
function saveCryptoTaxRecords(value){const clean=sanitizeCryptoTaxRecords(value);localStorage.setItem(activeStorageKey(CRYPTO_TAX_KEY),JSON.stringify(clean));return clean;}
function exportAppData(assets,history){const snapshots=sanitizeAssetSnapshots(JSON.parse(localStorage.getItem(activeStorageKey(ASSET_SNAPSHOTS_KEY))||"[]"));const rawLimits=localStorage.getItem(activeStorageKey(STRATEGY_LIMITS_KEY)),limits=rawLimits?sanitizeStrategyLimits(JSON.parse(rawLimits)):null;const backup={schemaVersion:BACKUP_SCHEMA_VERSION,version:"17.7",exportedAt:new Date().toISOString(),cashBalance:loadCashBalance(),assets,history,transactions:loadTransactionsFromStorage(),assetSnapshots:snapshots,strategyLimits:limits,cryptoTax:loadCryptoTaxRecords()};const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=`bitcoin1070-backup-${Date.now()}.json`;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);}
function backupSummary(data){return {version:String(data.version||"不明"),schemaVersion:data.schemaVersion??"旧形式",exportedAt:data.exportedAt||null,assetCount:Array.isArray(data.assets)?data.assets.length:0,transactionCount:Array.isArray(data.transactions)?data.transactions.length:0,cashBalance:Number(data.cashBalance||0)};}
function importAppData(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result),schema=data.schemaVersion;if(schema!==undefined&&![4,5,6,7].includes(schema))throw new Error(`未対応のバックアップ形式です (schemaVersion: ${schema})`);if(!Array.isArray(data.assets))throw new Error("資産データの形式が不正です");const assets=data.assets.map(sanitizeAsset),history=sanitizeHistory(data.history),transactions=Array.isArray(data.transactions)?data.transactions.map(sanitizeTransaction):[];let cashBalance=null;if(data.cashBalance!=null)cashBalance=safeNumber(data.cashBalance,"cashBalance");const assetSnapshots=schema>=6?sanitizeAssetSnapshots(data.assetSnapshots):[],strategyLimits=schema>=6&&data.strategyLimits!=null?sanitizeStrategyLimits(data.strategyLimits):null,cryptoTax=schema===7?sanitizeCryptoTaxRecords(data.cryptoTax):{annual:[],trades:[],openingBasis:{},baseIncome:{},coverage:{}};resolve({assets,history,cashBalance,transactions,assetSnapshots,strategyLimits,cryptoTax,metadata:backupSummary(data)});}catch(e){reject(e);}};reader.onerror=()=>reject(new Error("ファイルの読み込みに失敗しました"));reader.readAsText(file);});}
function resetAppStorage(){localStorage.removeItem(activeStorageKey(STORAGE_KEYS.ASSETS));localStorage.removeItem(activeStorageKey(STORAGE_KEYS.HISTORY));localStorage.removeItem(activeStorageKey(STORAGE_KEYS.TRANSACTIONS));localStorage.removeItem(activeStorageKey(CASH_STORAGE_KEY));localStorage.removeItem(activeStorageKey(ASSET_SNAPSHOTS_KEY));localStorage.removeItem(activeStorageKey(STRATEGY_LIMITS_KEY));localStorage.removeItem(activeStorageKey(CRYPTO_TAX_KEY));}
