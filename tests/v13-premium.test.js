const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const values=new Map([
 ['bitcoin1070_v3_assets',JSON.stringify([{type:'jp',symbol:'5803',name:'フジクラ',amount:10,cost:1000}])],
 ['bitcoin1070_v12_1_cash_jpy','123456'],
 ['bitcoin1070_demo_v13::bitcoin1070_v3_assets',JSON.stringify([{type:'crypto',symbol:'BTC',name:'Bitcoin',amount:.1,cost:9000000}])],
 ['bitcoin1070_demo_v13::bitcoin1070_v12_1_cash_jpy','750000']
]);
const session=new Map();
const localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
const sessionStorage={getItem:k=>session.get(k)??null,setItem:(k,v)=>session.set(k,String(v)),removeItem:k=>session.delete(k)};
function FileReader(){this.readAsText=f=>{this.result=f.contents;queueMicrotask(()=>this.onload());};}
const context={localStorage,sessionStorage,console,structuredClone,Blob,URL,FileReader,queueMicrotask,document:{createElement:()=>({click(){},remove(){}}),body:{appendChild(){}}}};
vm.createContext(context);vm.runInContext(`${fs.readFileSync('storage.js','utf8')}\nthis.api={loadAssetsFromStorage,loadCashBalance,saveCashBalance,importAppData,canUseDataManagement,requireDataManagement,DEMO_DATA_MANAGEMENT_MESSAGE};`,context);
assert.equal(context.api.loadAssetsFromStorage([])[0].symbol,'5803');assert.equal(context.api.loadCashBalance(),123456);
assert.equal(context.api.canUseDataManagement(),true);assert.doesNotThrow(()=>context.api.requireDataManagement());
session.set('bitcoin1070_v13_demo','1');assert.equal(context.api.canUseDataManagement(),false);assert.throws(()=>context.api.requireDataManagement(),/デモモード中はデータ管理操作を利用できません/);assert.equal(context.api.loadAssetsFromStorage([])[0].symbol,'BTC');context.api.saveCashBalance(700000);assert.equal(values.get('bitcoin1070_v12_1_cash_jpy'),'123456');
session.delete('bitcoin1070_v13_demo');assert.equal(context.api.canUseDataManagement(),true);assert.equal(context.api.loadCashBalance(),123456);
const before=new Map(values);context.api.importAppData({contents:'{"schemaVersion":5,"assets":"broken"}'}).then(()=>assert.fail('invalid backup accepted'),()=>{assert.deepEqual([...values], [...before]);console.log('v13 demo isolation and safe restore tests passed');});
