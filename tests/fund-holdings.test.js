const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const values=new Map();
const localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
const context={localStorage,console,structuredClone,Blob,URL,document:{createElement:()=>({}),body:{appendChild(){}}},FileReader:function(){}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('storage.js','utf8')+'\nthis.api={sanitizeAsset,applyLedgerTransaction,sanitizeAssetSnapshots,sanitizeTransaction}',context);
const {sanitizeAsset,applyLedgerTransaction,sanitizeAssetSnapshots,sanitizeTransaction}=context.api;
const fund=()=>sanitizeAsset({type:'fund',symbol:'0331418A',name:'オルカン',amount:150000,cost:2.5,navJpy:37000,navDate:'2026-09-21',accountType:'nisa'});
test('fund NAV, cost, buy, sell and account identity use 10,000 units',()=>{
 const a=fund();assert.equal(a.amount*a.navJpy/10000,555000);assert.equal(a.amount*a.cost,375000);
 let result=applyLedgerTransaction([a],100000,{kind:'BUY',date:'2026-09-22T10:00',type:'fund',symbol:a.symbol,name:a.name,quantity:10000,unitPrice:40000,feeJpy:0});
 assert.equal(result.cashBalance,60000);assert.equal(result.assets[0].cost,2.59375);assert.equal(result.entry.accountType,'nisa');
 result=applyLedgerTransaction(result.assets,result.cashBalance,{kind:'SELL',date:'2026-09-22T12:00',type:'fund',symbol:a.symbol,name:a.name,quantity:10000,unitPrice:40000,feeJpy:100});
 assert.equal(result.entry.costBasisJpy,25937.5);assert.equal(result.entry.realizedPnlJpy,13962.5);assert.equal(result.cashBalance,99900);
 assert.equal(sanitizeTransaction(result.entry).accountType,'nisa');
});
test('old snapshots load and fund snapshot survives backup validation',()=>{
 assert.equal(sanitizeAssetSnapshots([{date:'2026-09-21',total:100,crypto:0,jp:0,us:0,cash:100,complete:true}])[0].fund,0);
 assert.equal(sanitizeAssetSnapshots([{date:'2026-09-21',total:555000,crypto:0,jp:0,us:0,cash:0,fund:555000,complete:true}])[0].fund,555000);
 assert.throws(()=>sanitizeAsset({...fund(),navJpy:-1}),/基準価額/);
});
