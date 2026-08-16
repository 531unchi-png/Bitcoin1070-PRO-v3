const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const legacyAssets=[{type:"jp",symbol:"285A",name:"キオクシアホールディングス",amount:3,cost:1500,yahooSymbol:"285A.T"}],values=new Map([["bitcoin1070_v3_assets",JSON.stringify(legacyAssets)],["bitcoin1070_v12_1_cash_jpy","50000"],["bitcoin1070_v12_3_transactions",JSON.stringify([])]]);
const localStorage={getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
function FileReader(){this.readAsText=file=>{this.result=file.contents;queueMicrotask(()=>this.onload());};}
const context={localStorage,console,structuredClone,Blob,URL,document:{createElement:()=>({click(){},remove(){}}),body:{appendChild(){}}},FileReader,queueMicrotask};
vm.createContext(context);vm.runInContext(`${fs.readFileSync("storage.js","utf8")}\nthis.api={loadAssetsFromStorage,loadCashBalance,loadTransactionsFromStorage,importAppData,BACKUP_SCHEMA_VERSION,STORAGE_KEYS};`,context);
assert.equal(context.api.BACKUP_SCHEMA_VERSION,5);assert.equal(context.api.STORAGE_KEYS.TRANSACTIONS,"bitcoin1070_v12_3_transactions");assert.equal(context.api.loadAssetsFromStorage([])[0].symbol,"285A");assert.equal(context.api.loadCashBalance(),50000);
const backup={schemaVersion:4,assets:legacyAssets,history:[]};
context.api.importAppData({contents:JSON.stringify(backup)}).then(result=>{assert.equal(result.assets[0].amount,3);assert.equal(result.transactions.length,0);assert.equal(context.api.loadAssetsFromStorage([])[0].amount,3);console.log("storage compatibility tests passed");}).catch(error=>{console.error(error);process.exitCode=1;});
