const test=require('node:test');
const assert=require('node:assert/strict');
const {calculate,yearInJapan}=require('../tax-estimate.js');
const fs=require('node:fs'),vm=require('node:vm');
const sale=(type,pnl,accountType,date='2026-09-22T03:00:00Z')=>({kind:'SELL',type,realizedPnlJpy:pnl,accountType,date});
test('year boundary uses Japan date',()=>{assert.equal(yearInJapan('2025-12-31T16:00:00Z'),2026);assert.equal(yearInJapan('2026-12-31T14:59:00Z'),2026)});
test('taxable gains and losses offset; NISA does not offset taxable gains',()=>{
 const result=calculate([sale('jp',100000,'taxable'),sale('us',-20000,'taxable'),sale('fund',-300000,'nisa'),sale('crypto',40000),sale('jp',300000,'taxable','2025-01-01T00:00:00Z')],2026);
 assert.equal(result.taxableNet,80000);assert.equal(result.nisaNet,-300000);assert.equal(result.estimatedTax,16252);assert.equal(result.cryptoNet,40000);assert.equal(result.canEstimate,true);
});
test('unknown security account or taxable cost blocks estimate, crypto unknown basis does not',()=>{
 assert.equal(calculate([sale('jp',10000,'unknown')],2026).estimatedTax,null);
 assert.equal(calculate([sale('jp',null,'taxable')],2026).estimatedTax,null);
 const result=calculate([sale('jp',-2000,'taxable'),sale('crypto',null)],2026);
 assert.equal(result.estimatedTax,0);assert.equal(result.cryptoUnknownCost,1);
});
test('stock account survives ledger sale and validated backup transaction',()=>{
 const context={localStorage:{getItem:()=>null,setItem(){}},console,structuredClone,Blob,URL,document:{},FileReader:function(){}};
 vm.createContext(context);
 vm.runInContext(fs.readFileSync(require.resolve('../storage.js'),'utf8')+'\nthis.api={applyLedgerTransaction,sanitizeTransaction,sanitizeAsset}',context);
 const stock=context.api.sanitizeAsset({type:'us',symbol:'NVDA',name:'NVIDIA',amount:2,cost:100,costJpy:14000,accountType:'nisa'});
 const result=context.api.applyLedgerTransaction([stock],0,{kind:'SELL',date:'2026-09-22T12:00',type:'us',symbol:'NVDA',name:'NVIDIA',quantity:1,unitPrice:200,fxRate:150,feeJpy:0});
 assert.equal(result.entry.accountType,'nisa');
 assert.equal(context.api.sanitizeTransaction(result.entry).accountType,'nisa');
 assert.equal(calculate([result.entry],2026).estimatedTax,0);
});
